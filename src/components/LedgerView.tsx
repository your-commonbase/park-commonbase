'use client'

interface Entry {
  id: string
  data: string
  metadata: any
  embedding: number[]
  createdAt: string
  updatedAt: string
  collection: string
  parentId?: string
  comments?: Entry[]
}

interface LedgerViewProps {
  entries: Entry[]
  onEntryClick: (entry: Entry) => void
}

export default function LedgerView({ entries, onEntryClick }: LedgerViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatEmbedding = (embedding: number[]) => {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return 'N/A'
    }
    return embedding.slice(0, 3).map(n => n.toFixed(3)).join(', ')
  }

  const getAuthor = (metadata: any) => {
    if (metadata?.author?.name) {
      return metadata.author.name
    }
    return 'Anonymous'
  }

  const getEntryType = (metadata: any) => {
    return metadata?.type || 'text'
  }

  // Sort entries by creation date, newest first
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="w-full h-full overflow-auto bg-white">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-800">Collection Ledger</h2>
          <p className="text-sm text-gray-600">{entries.length} entries total</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                  Type
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                  Description
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                  Author
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                  Created At
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                  Embedding (first 3)
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onEntryClick(entry)}
                >
                  <td className="border border-gray-300 px-4 py-2">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      getEntryType(entry.metadata) === 'image' ? 'bg-yellow-500' :
                      getEntryType(entry.metadata) === 'audio' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}></span>
                    {getEntryType(entry.metadata)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 max-w-md">
                    {truncateText(entry.data)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {getAuthor(entry.metadata)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-mono text-xs">
                    {formatEmbedding(entry.embedding)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {entry.comments && entry.comments.length > 0 ? (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {entry.comments.length}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No entries in this collection</p>
          </div>
        )}
      </div>
    </div>
  )
}