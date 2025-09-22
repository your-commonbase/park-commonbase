# Park Commonbase API - cURL Examples

This document provides cURL examples for all Park Commonbase API endpoints. Make sure to replace `YOUR_API_KEY` with your actual API key and ensure the server is running on `http://localhost:3000`.

## Authentication

All API endpoints require an `x-api-key` header:
```bash
-H "x-api-key: YOUR_API_KEY"
```

## Data Endpoints

### 1. Add Text Entry

Add a simple text note to a collection:

```bash
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "data": "Beautiful sunny day at the park. Kids are playing on the swings.",
    "collection": "central-park",
    "metadata": {
      "author": {
        "name": "John Doe",
        "instagram": "johndoe"
      }
    }
  }'
```

### 2. Add Text Comment

Add a comment to an existing entry (requires parent entry ID):

```bash
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "data": "I totally agree! Perfect weather for outdoor activities.",
    "collection": "central-park",
    "parentId": "PARENT_ENTRY_ID_HERE",
    "metadata": {
      "author": {
        "name": "Jane Smith"
      }
    }
  }'
```

### 3. Add Image Entry

Upload an image file and generate a caption:

```bash
curl -X POST http://localhost:3000/api/add_image \
  -H "x-api-key: YOUR_API_KEY" \
  -F "image=@/path/to/your/photo.jpg" \
  -F "collection=central-park" \
  -F 'metadata={"author":{"name":"Alice Johnson","instagram":"alicephotos"}}'
```

### 4. Add Audio Entry

Upload an audio file and generate a transcription:

```bash
curl -X POST http://localhost:3000/api/add_audio \
  -H "x-api-key: YOUR_API_KEY" \
  -F "audio=@/path/to/your/recording.mp3" \
  -F "collection=central-park" \
  -F 'metadata={"author":{"name":"Bob Wilson","url":"https://bobwilson.com"}}'
```

### 5. Get Collection Data

Retrieve all entries for a specific collection:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/api/collection/central-park"
```

Get all entries (default collection):

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/api/collection/default"
```

### 6. Export CSV

Export all entries as CSV:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/api/export_csv" \
  -o entries.csv
```

Export specific collection as CSV:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "http://localhost:3000/api/export_csv?collection=central-park" \
  -o central-park-entries.csv
```

## Admin Endpoints

### 7. Admin Sign In

Sign in as admin to access admin-only features:

```bash
curl -X POST http://localhost:3000/api/admin_signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "admin",
    "password": "your_admin_password"
  }'
```

The `-c cookies.txt` flag saves the session cookie for subsequent admin requests.

### 8. Delete Entry (Admin Only)

Delete an entry and all its associated files:

```bash
curl -X DELETE http://localhost:3000/api/delete_entry/ENTRY_ID_HERE \
  -b cookies.txt
```

### 9. Delete Comment (Admin Only)

Delete a comment:

```bash
curl -X DELETE http://localhost:3000/api/delete_comment/COMMENT_ID_HERE \
  -b cookies.txt
```

## Complete Workflow Example

Here's a complete workflow showing how to use the API:

```bash
# 1. Set your API key
API_KEY="your_actual_api_key_here"

# 2. Add a text entry
RESPONSE=$(curl -s -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "data": "Great day for a picnic in the park!",
    "collection": "test-park",
    "metadata": {"author": {"name": "Test User"}}
  }')

# Extract the entry ID from the response
ENTRY_ID=$(echo $RESPONSE | jq -r '.id')
echo "Created entry: $ENTRY_ID"

# 3. Add a comment to that entry
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"data\": \"Agreed! I love this park.\",
    \"collection\": \"test-park\",
    \"parentId\": \"$ENTRY_ID\",
    \"metadata\": {\"author\": {\"name\": \"Commenter\"}}
  }"

# 4. Add an image
curl -X POST http://localhost:3000/api/add_image \
  -H "x-api-key: $API_KEY" \
  -F "image=@photo.jpg" \
  -F "collection=test-park"

# 5. Get all entries for the collection
curl -H "x-api-key: $API_KEY" \
  "http://localhost:3000/api/collection/test-park" | jq .

# 6. Export to CSV
curl -H "x-api-key: $API_KEY" \
  "http://localhost:3000/api/export_csv?collection=test-park" \
  -o test-park-export.csv

# 7. Admin operations (if needed)
curl -X POST http://localhost:3000/api/admin_signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "admin", "password": "your_password"}'

# Delete the entry
curl -X DELETE http://localhost:3000/api/delete_entry/$ENTRY_ID \
  -b cookies.txt
```

## Response Formats

### Successful Entry Creation
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Entry created successfully"
}
```

### Image Entry Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "caption": "A beautiful park scene with children playing...",
  "imageFile": "550e8400-e29b-41d4-a716-446655440000.jpg",
  "message": "Image entry created successfully"
}
```

### Audio Entry Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "transcription": "Hello, this is a test recording from the park...",
  "audioFile": "550e8400-e29b-41d4-a716-446655440000.mp3",
  "message": "Audio entry created successfully"
}
```

### Error Response
```json
{
  "error": "Invalid API key"
}
```

## Testing Script

For automated testing of all endpoints, use the provided test script:

```bash
# Make sure to update the API_KEY variable in the script first
./test-endpoints.sh

# Or run individual tests:
./test-endpoints.sh text
./test-endpoints.sh image
./test-endpoints.sh audio
```

## Notes

- All file uploads use `multipart/form-data`
- Audio files should be in a format supported by OpenAI Whisper (MP3, MP4, WAV, etc.)
- Images should be in common formats (JPEG, PNG, WebP, etc.)
- The embedding generation happens automatically for all content
- UMAP visualization updates automatically when new entries are added
- Admin session cookies expire after 24 hours
- File storage is local in the `public/audio/` and `public/images/` directories