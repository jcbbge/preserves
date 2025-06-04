/**
 * Viewer template generation functions
 */

/**
 * Generate HTML template for the viewer
 */
export function generateViewerHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peach Archive - {{USERNAME}}</title>
  <link rel="stylesheet" href="viewer.css">
</head>
<body>
  <header>
    <div class="logo-container">
      <img src="peachdotcool.png" alt="Peach Logo" class="logo">
      <h1>Peach Archive</h1>
    </div>
    <div class="user-info">
      <span class="username">@{{USERNAME}}</span>
      <span class="export-date">Exported: {{EXPORT_DATE}}</span>
    </div>
  </header>

  <main>

    <div class="timeline" id="timeline">
      <!-- Posts will be inserted here by JavaScript -->
      <div class="loading">Loading posts...</div>
    </div>
  </main>

  <footer>
    <p>Created with Peach Preserves - © 2025 jcbbge</p>
  </footer>

  <script src="data.js"></script>
  <script src="viewer.js"></script>
  <script>
    // Initialize the viewer after all scripts load
    document.addEventListener('DOMContentLoaded', initializeArchiveViewer);
  </script>
</body>
</html>`;
}

/**
 * Generate CSS for the viewer
 */
export function generateViewerCSS(): string {
  return `/* Peach Archive Viewer Styles */
:root {
  --peach-primary: #ff98a8;
  --peach-secondary: #7956b3;
  --peach-accent: #d7c9fb;
  --peach-dark: #333;
  --peach-light: #f9f9f9;
  --radius: 8px;
  --shadow: 0 2px 10px rgba(0,0,0,0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: var(--peach-dark);
  background-color: var(--peach-light);
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

header {
  background-color: var(--peach-primary);
  color: white;
  padding: 1.5rem;
  border-radius: var(--radius);
  margin-bottom: 1rem;
  text-align: center;
  box-shadow: var(--shadow);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.logo {
  width: 40px;
  height: 40px;
  margin-right: 10px;
}

h1 {
  margin: 0;
  font-size: 1.8rem;
}

.user-info {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9rem;
}


.timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.post {
  background-color: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: transform 0.2s;
}

.post:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.post-date {
  font-weight: bold;
}

.post-content {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.post-media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.media-item {
  width: 100%;
  border-radius: calc(var(--radius) - 4px);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.media-item img, .media-item video {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s;
}

.media-item:hover img, .media-item:hover video {
  transform: scale(1.03);
}

.post-footer {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #888;
}

.post-stats {
  display: flex;
  gap: 1rem;
}

.empty-timeline {
  text-align: center;
  padding: 2rem;
  background-color: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #888;
}

.post-error {
  background-color: #fff5f5;
  color: #e74c3c;
  padding: 1rem;
  border-radius: var(--radius);
  border-left: 4px solid #e74c3c;
}

.media-error {
  background-color: #f8f8f8;
  color: #666;
  padding: 1rem;
  text-align: center;
  border-radius: var(--radius);
  font-size: 0.9rem;
}

footer {
  margin-top: 3rem;
  text-align: center;
  color: #888;
  font-size: 0.8rem;
  padding: 1rem;
  border-top: 1px solid #eee;
}

/* Mobile Responsiveness */
@media (max-width: 600px) {
  body {
    padding: 0.5rem;
  }
  
  header {
    padding: 1rem;
  }
  
  .logo {
    width: 30px;
    height: 30px;
  }
  
  h1 {
    font-size: 1.5rem;
  }
  
  
  .post {
    padding: 1rem;
  }
  
  
  .post-media {
    grid-template-columns: 1fr;
  }
}`;
}

/**
 * Generate JavaScript for the viewer
 */
export function generateViewerJS(): string {
  return `// Peach Archive Viewer Script
function initializeArchiveViewer() {
  const timeline = document.getElementById('timeline');
  
  // Get the data from the global variable set by data.js
  const archiveData = window.ARCHIVE_DATA_JSON;
  
  // Store sorted posts for filtering
  let sortedPosts = [];
  
  // Initialize the viewer and set up event listeners
  function initializeViewer() {
    if (!archiveData || !archiveData.posts || archiveData.posts.length === 0) {
      timeline.innerHTML = '<div class="empty-timeline">No posts found in this archive.</div>';
      return;
    }
    
    // Sort posts by creation time (newest first)
    sortedPosts = [...archiveData.posts].sort((a, b) => b.createdTime - a.createdTime);
    
    // Display all posts initially
    displayPosts(sortedPosts);
  }
  
  // Display posts in the timeline
  function displayPosts(posts) {
    // Clear timeline
    timeline.innerHTML = '';
    
    if (posts.length === 0) {
      timeline.innerHTML = '<div class="empty-timeline">No posts found in this archive.</div>';
      return;
    }
    
    // Add posts
    posts.forEach(post => {
      const postElement = createPostElement(post);
      timeline.appendChild(postElement);
    });
  }
  
  // Create an HTML element for a post
  function createPostElement(post) {
    const postElement = document.createElement('article');
    postElement.className = 'post';
    postElement.setAttribute('data-id', post.id);
    
    try {
      // Format the post date
      let postDate;
      const timestamp = post.createdTime;
      
      if (timestamp) {
        const dateObj = timestamp > 9999999999 
          ? new Date(timestamp) 
          : new Date(timestamp * 1000);
        
        postDate = dateObj.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        postDate = 'Unknown date';
      }
      
      // Create post HTML structure
      postElement.innerHTML = '<div class="post-header"><span class="post-date">' + postDate + '</span><span class="post-id">#' + post.id + '</span></div><div class="post-content">' + formatMessage(post.message) + '</div>' + createPostMediaHtml(post) + '<div class="post-footer"><div class="post-stats">' + (post.likeCount ? '<span class="likes">❤️ ' + post.likeCount + '</span>' : '') + (post.commentCount ? '<span class="comments">💬 ' + post.commentCount + '</span>' : '') + '</div></div>';
      
    } catch (error) {
      console.error('Error creating post element:', error, post);
      postElement.innerHTML = '<div class="post-error"><div class="post-header">Error displaying post #' + (post.id || 'unknown') + '</div></div>';
    }
    
    return postElement;
  }
  
  // Create the media HTML for a post
  function createPostMediaHtml(post) {
    let mediaContent = '';

    // Check for local media paths from the archive
    if (post.localMediaPaths && post.localMediaPaths.length > 0) {
      mediaContent = createMediaElements(post.localMediaPaths);
    }
    // Check the post.media array
    else if (post.media && post.media.length > 0) {
      mediaContent = createMediaElementsFromMedia(post.media, post.id);
    }

    return mediaContent ? '<div class="post-media">' + mediaContent + '</div>' : '';
  }
  
  // Format the message content for display
  function formatMessage(message) {
    try {
      if (!message) return '';
      
      // Handle array-style messages
      if (Array.isArray(message)) {
        const textParts = [];
        
        for (let i = 0; i < message.length; i++) {
          if (message[i] && message[i].type === 'text') {
            textParts.push(message[i].text);
          }
        }
        
        if (textParts.length > 0) {
          return textParts.join('\\n\\n').replace(/\\n/g, '<br>');
        }
      }

      // Handle simple string messages
      if (typeof message === 'string') {
        return message.replace(/\\n/g, '<br>');
      }
      
      return '';
    } catch (error) {
      console.error('Error formatting message:', error, message);
      return '<em>Error displaying message content</em>';
    }
  }
  
  // Create HTML elements for media files using paths
  function createMediaElements(mediaPaths) {
    if (!mediaPaths || !Array.isArray(mediaPaths)) return '';

    try {
      return mediaPaths.map(path => {
        if (!path) return '';

        const isVideo = path.endsWith('.mp4') || path.endsWith('.webm');
        const mediaPath = 'media/' + path;

        if (isVideo) {
          return '<div class="media-item"><video controls><source src="' + mediaPath + '" type="video/' + (path.endsWith('.mp4') ? 'mp4' : 'webm') + '">Your browser does not support the video tag.</video></div>';
        } else {
          return '<div class="media-item"><img src="' + mediaPath + '" alt="Post media" loading="lazy"></div>';
        }
      }).join('');
    } catch (error) {
      console.error('Error creating media elements:', error);
      return '<div class="media-error">Error displaying media</div>';
    }
  }

  // Create HTML elements directly from media objects
  function createMediaElementsFromMedia(mediaItems, postId) {
    if (!mediaItems || !Array.isArray(mediaItems)) return '';

    try {
      return mediaItems.map((media, index) => {
        if (!media || !media.url) return '';

        const url = media.url;
        const ext = url.split('.').pop()?.toLowerCase() || '';
        const isVideo = ext === 'mp4' || ext === 'webm';

        let filename = '';
        if (postId) {
          const shortPostId = postId.substring(0, 8);
          const paddedIndex = String(index).padStart(2, '0');
          filename = 'post_' + shortPostId + '_img_' + paddedIndex + '.' + (ext || 'jpg');
        } else {
          filename = 'media_' + String(index).padStart(3, '0') + '.' + (ext || 'jpg');
        }

        const mediaPath = 'media/' + filename;

        if (isVideo) {
          return '<div class="media-item"><video controls><source src="' + mediaPath + '" type="video/' + ext + '">Your browser does not support the video tag.</video></div>';
        } else {
          return '<div class="media-item"><img src="' + mediaPath + '" alt="Post media" loading="lazy"></div>';
        }
      }).join('');
    } catch (error) {
      console.error('Error creating media elements from media objects:', error);
      return '<div class="media-error">Error displaying media</div>';
    }
  }
  
  // Display the posts
  initializeViewer();
}`;
}