export interface MediaFile {
  id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  public_url: string
  thumbnail_url?: string
  alt?: string
  caption?: string
  tags: string[]
  uploaded_at: string
  fileSize: string
  uploadedAt: string
  isImage: boolean
  isVideo: boolean
  isDocument: boolean
}

export interface MediaGridData {
  files: MediaFile[]
  viewMode?: 'grid' | 'list'
  selectable?: boolean
  emptyMessage?: string
  className?: string
}

export function renderMediaGrid(data: MediaGridData): string {
  if (data.files.length === 0) {
    return `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-white">No media files</h3>
        <p class="mt-1 text-sm text-gray-300">${data.emptyMessage || 'Get started by uploading your first file.'}</p>
      </div>
    `
  }

  const gridClass = data.viewMode === 'list' ? 'space-y-4' : 'media-grid'
  
  return `
    <div class="${gridClass} ${data.className || ''}">
      ${data.files.map(file => renderMediaFileCard(file, data.viewMode, data.selectable)).join('')}
    </div>
  `
}

export function renderMediaFileCard(file: MediaFile, viewMode: 'grid' | 'list' = 'grid', selectable: boolean = false): string {
  if (viewMode === 'list') {
    return `
      <div class="media-item backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all" data-file-id="${file.id}">
        <div class="flex items-center p-4">
          ${selectable ? `
            <div class="flex-shrink-0 mr-4">
              <input type="checkbox" class="rounded media-checkbox" value="${file.id}" onchange="toggleFileSelection('${file.id}')">
            </div>
          ` : ''}
          
          <div class="flex-shrink-0 mr-4">
            ${file.isImage ? `
              <img src="${file.thumbnail_url || file.public_url}" alt="${file.alt || file.original_name}" 
                   class="w-16 h-16 object-cover rounded-lg">
            ` : `
              <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                ${getFileIcon(file.mime_type)}
              </div>
            `}
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-white truncate" title="${file.original_name}">
                ${file.original_name}
              </h4>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-300">${file.fileSize}</span>
                <button 
                  class="text-gray-300 hover:text-white"
                  hx-get="/admin/media/${file.id}/details"
                  hx-target="#file-modal-content"
                  onclick="document.getElementById('file-modal').classList.remove('hidden')"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="mt-1 flex items-center text-sm text-gray-300">
              <span>${file.uploadedAt}</span>
              ${file.tags.length > 0 ? `
                <span class="mx-2">•</span>
                <div class="flex items-center space-x-1">
                  ${file.tags.slice(0, 2).map(tag => `
                    <span class="inline-block px-2 py-1 text-xs backdrop-blur-sm bg-white/20 text-white rounded-xl">
                      ${tag}
                    </span>
                  `).join('')}
                  ${file.tags.length > 2 ? `<span class="text-xs text-gray-300">+${file.tags.length - 2}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `
  }

  // Grid view
  return `
    <div class="media-item relative backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-200 overflow-hidden group" data-file-id="${file.id}">
      ${selectable ? `
        <div class="absolute top-2 left-2 z-10">
          <input type="checkbox" class="rounded media-checkbox" value="${file.id}" onchange="toggleFileSelection('${file.id}')">
        </div>
      ` : ''}
      
      <div class="aspect-square relative">
        ${file.isImage ? `
          <img src="${file.thumbnail_url || file.public_url}" alt="${file.alt || file.original_name}" 
               class="w-full h-full object-cover">
        ` : `
          <div class="w-full h-full backdrop-blur-sm bg-white/10 flex items-center justify-center">
            ${getFileIcon(file.mime_type)}
          </div>
        `}
        
        <!-- Overlay actions -->
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div class="flex space-x-2">
            <button 
              hx-get="/admin/media/${file.id}/details"
              hx-target="#file-modal-content"
              onclick="document.getElementById('file-modal').classList.remove('hidden')"
              class="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
            <button 
              onclick="event.stopPropagation(); copyToClipboard('${file.public_url}')"
              class="p-2 backdrop-blur-sm bg-white/20 rounded-full hover:bg-white/30 transition-all"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div class="p-3">
        <h4 class="text-sm font-medium text-white truncate" title="${file.original_name}">
          ${file.original_name}
        </h4>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-gray-300">${file.fileSize}</span>
          <span class="text-xs text-gray-300">${file.uploadedAt}</span>
        </div>
        ${file.tags.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${file.tags.slice(0, 2).map(tag => `
              <span class="inline-block px-2 py-1 text-xs backdrop-blur-sm bg-white/20 text-white rounded-xl">
                ${tag}
              </span>
            `).join('')}
            ${file.tags.length > 2 ? `<span class="text-xs text-gray-300">+${file.tags.length - 2}</span>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return `
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    `
  } else if (mimeType.startsWith('video/')) {
    return `
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    `
  } else if (mimeType === 'application/pdf') {
    return `
      <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    `
  } else {
    return `
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    `
  }
}