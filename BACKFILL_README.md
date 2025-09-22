# UploadThing Migration & Backfill Guide

This guide explains how to migrate your existing local image and audio files to UploadThing hosting.

## Prerequisites

1. **UploadThing Account**: Sign up at https://uploadthing.com
2. **Get Your Credentials**:
   - Go to your UploadThing dashboard
   - Copy your `UPLOADTHING_TOKEN` and `UPLOADTHING_APP_NAME`

## Setup

1. **Add Environment Variables**:
   Add these to your `.env.local` file:
   ```env
   UPLOADTHING_TOKEN=your_token_here
   UPLOADTHING_APP_NAME=your_app_name_here
   ```

2. **Verify Setup**:
   ```bash
   npm run test-uploadthing
   ```

## Running the Backfill

The backfill script will:
- Find all database entries with local image/audio files
- Upload those files to UploadThing via your Next.js API
- Update the database with UploadThing URLs
- Preserve original local files for backup

**Important: The dev server must be running during backfill!**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **In a new terminal, run the backfill:**
   ```bash
   npm run backfill-uploadthing
   ```

> The backfill script uploads files through your Next.js API route (`/api/uploadthing`) to ensure proper authentication and routing.

## What Happens

### Before Backfill:
- Images served from `/public/images/filename.jpg` → `http://localhost:3000/images/filename.jpg`
- Audio served from `/public/audio/filename.mp3` → `http://localhost:3000/audio/filename.mp3`
- Database metadata: `{ imageFile: "filename.jpg" }`

### After Backfill:
- Images served from UploadThing → `https://utfs.io/f/abc123def456.jpg`
- Audio served from UploadThing → `https://utfs.io/f/xyz789abc123.mp3`
- Database metadata: `{ imageFile: "filename.jpg", imageUrl: "https://utfs.io/f/..." }`

### Backward Compatibility:
- The app checks for `imageUrl`/`audioUrl` first
- Falls back to local files if UploadThing URL not available
- No existing functionality breaks

## Monitoring Progress

The backfill script provides detailed logging:
```
🖼️  Starting image backfill...
Found 15 image files
Processing 12 entries with local images
📤 Uploading image1.jpg...
  📤 Starting upload for image1.jpg (245KB)
  📡 Got presigned URL, uploading to S3...
  ✅ Upload complete: https://utfs.io/f/abc123def456
✅ image1.jpg -> https://utfs.io/f/abc123def456
```

## Safety Features

- **Non-destructive**: Original files remain in `/public/images` and `/public/audio`
- **Error handling**: Skips files that fail to upload, continues with others
- **Rate limiting**: 500ms delay between uploads to avoid overwhelming UploadThing
- **Detailed logging**: Shows exactly what's happening for each file

## Troubleshooting

### "UPLOADTHING_TOKEN is required"
- Make sure `.env.local` exists in your project root
- Check that the environment variables are spelled correctly
- Restart your development server after adding variables

### "UploadThing API error: 401"
- Your token might be incorrect or expired
- Generate a new token from the UploadThing dashboard

### "Failed to process filename.jpg"
- The file might be corrupted or in an unsupported format
- Check that the file exists in the expected directory
- The script will continue with other files

## File Size Limits

- **Images**: 4MB maximum
- **Audio**: 32MB maximum

Files exceeding these limits will be skipped with an error message.

## After Migration

Once the backfill is complete:
1. All new uploads will go directly to UploadThing
2. All existing files will be served from UploadThing
3. Your app will be faster and more scalable
4. You can eventually clean up local files if desired

## Manual Verification

You can check the migration success by:
1. Looking at the database entries - they should have both `imageFile` and `imageUrl` fields
2. Opening the app and viewing images/audio - they should load from UploadThing URLs
3. Checking the browser network tab to see UploadThing domains (`utfs.io`)

## Support

If you encounter issues:
1. Check the detailed logs from the backfill script
2. Verify your UploadThing dashboard shows the uploaded files
3. Test with a small number of files first if you have many