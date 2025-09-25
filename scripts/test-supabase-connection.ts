/**
 * Test Supabase connection script
 *
 * This script tests various connection string formats to help diagnose
 * connection issues with Supabase PostgreSQL.
 */

import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables
config({ path: '.env.local' })

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    console.log('Please add your Supabase connection string to .env.local')
    process.exit(1)
  }

  console.log('🔗 Connection string format:', process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@'))

  const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
  console.log('📋 Target table name:', tableName)

  // Test different connection approaches
  const connectionTests = [
    {
      name: 'Basic Connection Test',
      test: async () => {
        const prisma = new PrismaClient()
        try {
          await prisma.$connect()
          console.log('✅ Basic connection successful')
          await prisma.$disconnect()
          return true
        } catch (error) {
          console.error('❌ Basic connection failed:', error)
          return false
        }
      }
    },
    {
      name: 'Database Query Test',
      test: async () => {
        const prisma = new PrismaClient()
        try {
          await prisma.$connect()
          // Test a simple query
          const result = await prisma.$queryRaw`SELECT version() as version`
          console.log('✅ Database query successful')
          console.log('   Database version:', (result as any)[0]?.version?.substring(0, 50) + '...')
          await prisma.$disconnect()
          return true
        } catch (error) {
          console.error('❌ Database query failed:', error)
          return false
        }
      }
    },
    {
      name: 'pgvector Extension Test',
      test: async () => {
        const prisma = new PrismaClient()
        try {
          await prisma.$connect()
          // Test pgvector extension
          await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`
          console.log('✅ pgvector extension available')
          await prisma.$disconnect()
          return true
        } catch (error) {
          console.error('❌ pgvector extension test failed:', error)
          return false
        }
      }
    }
  ]

  let allPassed = true

  for (const connectionTest of connectionTests) {
    console.log(`\n🧪 ${connectionTest.name}...`)
    const passed = await connectionTest.test()
    if (!passed) {
      allPassed = false
    }
  }

  console.log('\n' + '='.repeat(50))

  if (allPassed) {
    console.log('✅ All connection tests passed! Your Supabase setup is ready for migration.')
  } else {
    console.log('❌ Some connection tests failed. Please check the following:')
    console.log('\n🔍 Troubleshooting steps:')
    console.log('1. Verify your DATABASE_URL in .env.local')
    console.log('2. Check if your Supabase project is active')
    console.log('3. Try the connection pooling URL format:')
    console.log('   postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres')
    console.log('4. Check Supabase Dashboard → Settings → Database for the correct URL')
    console.log('5. Ensure your IP is allowed (or disable IP restrictions temporarily)')
    console.log('6. Verify your database password is correct')
  }
}

if (require.main === module) {
  testSupabaseConnection()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Connection test failed:', error)
      process.exit(1)
    })
}

export { testSupabaseConnection }