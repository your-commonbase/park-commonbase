# Park Commonbase

Park Commonbase is a web application that captures voice memos, images, and text notes from people at the park and visualizes them in a UMAP (Uniform Manifold Approximation and Projection) space. The application uses AI to process content and create meaningful connections between entries.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-commonbase%2Fpark-commonbase&env=SB_URL,DATABASE_TABLE_NAME,OPENAI_API_KEY,API_KEY,NEXT_PUBLIC_API_KEY,ADMIN_USERNAME,ADMIN_PASSWORD,UPLOADTHING_TOKEN,UPLOADTHING_APP_NAME,NEXT_PUBLIC_GRAPH_DISPLAY_MODE&envDescription=Configure%20your%20database%20and%20API%20keys&envLink=https%3A%2F%2Fgithub.com%2Fyour-commonbase%2Fpark-commonbase%2Fblob%2Fmain%2FDEPLOYMENT.md&demo-title=Park%20Commonbase&demo-description=AI-powered%20knowledge%20management%20for%20communities)

📋 **[Full Deployment Guide](DEPLOYMENT.md)** - Step-by-step instructions for Vercel + Supabase deployment

## Features

- **Multi-modal Input**: Accept text notes, voice recordings, and images
- **AI Processing**:
  - Audio transcription using OpenAI Whisper
  - Image captioning using OpenAI GPT-4 Vision
  - Text embedding generation using OpenAI Embeddings
- **UMAP Visualization**: Interactive 2D visualization of entries based on semantic similarity
- **Collections**: Organize entries into different collections/parks
- **Comments**: Add comments to entries with full admin controls
- **CSV Export**: Export all data for analysis
- **Admin Panel**: Secure admin authentication for content management

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Fill in your environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `API_KEY`: Secure API key for endpoint access
   - `NEXT_PUBLIC_API_KEY`: Same API key for client-side requests
   - `ADMIN_USERNAME`: Admin username (default: admin)
   - `ADMIN_PASSWORD`: Admin password

3. **Set up the database**:
   ```bash
   npx prisma db push
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** to [http://localhost:3000](http://localhost:3000)

## API Endpoints

All API endpoints require an `x-api-key` header with your API key.

### Data Endpoints
- `POST /api/add` - Add a text entry
- `POST /api/add_audio` - Add an audio entry (with file upload)
- `POST /api/add_image` - Add an image entry (with file upload)
- `GET /api/collection/:collection` - Get all entries for a collection
- `GET /api/export_csv` - Export entries as CSV

### Admin Endpoints
- `POST /api/admin_signin` - Sign in as admin
- `DELETE /api/delete_entry/:id` - Delete an entry (admin only)
- `DELETE /api/delete_comment/:id` - Delete a comment (admin only)

## Data Schema

Entries are stored with the following structure:

```typescript
{
  id: string,           // UUID
  data: string,         // Text content, transcription, or caption
  metadata: {
    type?: 'text' | 'audio' | 'image',
    audioFile?: string,   // Filename for audio entries
    imageFile?: string,   // Filename for image entries
    author?: {
      name?: string,
      instagram?: string,
      url?: string
    },
    comment_ids?: string[]  // Array of comment IDs
  },
  embedding: string,    // JSON string of 1536-dimension vector
  createdAt: datetime,
  updatedAt: datetime,
  collection: string,   // Collection/park name
  parentId?: string     // For comments, ID of parent entry
}
```

## Usage

### Visualization
- View entries as points in 2D UMAP space
- Different types show as different shapes (circles for text, rectangles for images, circles with play icon for audio)
- Click on any point to open the sidebar with full details
- Lines connect comments to their parent entries

### Adding Content
Use the API endpoints to add content:

```bash
# Add text
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"data": "This is a text note", "collection": "central-park"}'

# Add image (requires form data)
curl -X POST http://localhost:3000/api/add_image \
  -H "x-api-key: YOUR_API_KEY" \
  -F "image=@photo.jpg" \
  -F "collection=central-park"

# Add audio (requires form data)
curl -X POST http://localhost:3000/api/add_audio \
  -H "x-api-key: YOUR_API_KEY" \
  -F "audio=@recording.mp3" \
  -F "collection=central-park"
```

### Admin Mode
1. Click "Admin" button in the top-right corner
2. Sign in with your admin credentials
3. In admin mode, you can:
   - Add comments to entries
   - Delete entries and comments
   - View all admin controls in the sidebar

## File Storage

### Development
- Audio files are stored locally in `public/audio/`
- Image files are stored locally in `public/images/`
- Database uses PostgreSQL (local or Supabase)

### Production
- **UploadThing** handles file uploads (images and audio)
- Files are served from UploadThing's CDN for better performance
- Database uses Supabase PostgreSQL with pgvector extension

## Development

- Built with Next.js 15, TypeScript, and Tailwind CSS
- Uses Prisma ORM for database management
- D3.js and UMAP-js for visualization
- OpenAI APIs for content processing

## Production Notes

- **UploadThing** is pre-configured for file storage (no S3 setup needed)
- **Supabase** provides PostgreSQL with pgvector extension
- **Vercel** deployment is fully supported with one-click deploy
- Set up proper environment variables for production
- Consider using Redis for session storage instead of in-memory
- Set up database backups and monitoring through Supabase