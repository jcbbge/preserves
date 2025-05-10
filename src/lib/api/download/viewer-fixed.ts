/**
 * Modified version of viewer.ts to fix media loading issues
 * and add comment modal functionality
 */

/**
 * Generate CSS for the viewer
 */
export function generateViewerCSS(): string {
  // Peach Archive Viewer Styles - Add modal styles
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

.search-bar {
  background-color: white;
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow);
}

.search-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 2;
}

.time-filter {
  display: flex;
  gap: 1rem;
  flex: 2;
}

.year-filter, .month-filter {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.search-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

#search-input, #year-select, #month-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  width: 100%;
}

/* Fun Stats Styles */
.fun-stats {
  background-color: white;
  border-radius: var(--radius);
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: var(--shadow);
}

.fun-stats h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--peach-secondary);
}

.fun-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.fun-stat {
  background-color: #f9f9f9;
  border-radius: var(--radius);
  padding: 1rem;
}

.fun-stat h4 {
  margin-top: 0;
  color: var(--peach-primary);
  margin-bottom: 0.8rem;
}

.emoji-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.emoji-item {
  font-size: 1.5rem;
}

.emoji-count {
  font-size: 0.8rem;
  color: #666;
  margin-left: 0.2rem;
}

.word-stats, .activity-data {
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Timeline Month/Year Headers */
.month-year-header {
  background-color: var(--peach-accent);
  color: var(--peach-secondary);
  padding: 0.8rem 1.2rem;
  margin: 1.5rem -1rem 1rem;
  border-radius: var(--radius);
  font-weight: bold;
  box-shadow: var(--shadow);
  position: sticky;
  top: 10px;
  z-index: 10;
}

#search-btn, #reset-btn {
  padding: 0.5rem 1rem;
  background-color: var(--peach-secondary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

#reset-btn {
  background-color: #666;
}

#search-btn:hover {
  background-color: #6745a0;
}

#reset-btn:hover {
  background-color: #555;
}

.stats {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background-color: white;
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 80px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--peach-secondary);
}

.stat-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #888;
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
  cursor: pointer;
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

.hidden {
  display: none !important;
}

footer {
  margin-top: 3rem;
  text-align: center;
  color: #888;
  font-size: 0.8rem;
  padding: 1rem;
  border-top: 1px solid #eee;
}

/* Modal Styles - For both comments and images */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.modal-overlay.active {
  opacity: 1;
  pointer-events: auto;
}

.modal-container {
  background-color: white;
  border-radius: var(--radius);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  position: relative;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.2rem;
  color: var(--peach-secondary);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #888;
  transition: color 0.2s;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: var(--peach-secondary);
}

.modal-content {
  padding: 1rem;
}

/* Comment Styles */
.comment-list {
  margin-top: 0.5rem;
}

.comment {
  padding: 0.8rem;
  border-bottom: 1px solid #eee;
}

.comment:last-child {
  border-bottom: none;
}

.comment-author {
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  text-transform: uppercase;
}

.comment-body {
  color: var(--peach-dark);
}

/* Image Modal Styles */
.image-modal-container {
  background-color: transparent;
  max-width: 95%;
  max-height: 95vh;
  width: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fullscreen-image {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
}

.image-close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1010;
}

/* Multi-media post layout */
.full-width-media .post-media {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.full-width-media .media-item {
  width: 100%;
  margin-bottom: 0.5rem;
}

.full-width-media .media-item img,
.full-width-media .media-item video {
  width: 100%;
  height: auto;
  cursor: pointer;
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
  
  .search-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.8rem;
  }
  
  .search-field, .date-field, .search-buttons {
    width: 100%;
  }
  
  .search-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .search-buttons button {
    width: 100%;
    margin-bottom: 0.3rem;
  }
  
  .post {
    padding: 1rem;
  }
  
  .stats {
    padding: 0.8rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .post-media {
    grid-template-columns: 1fr;
  }
  
  .modal-container {
    width: 95%;
    max-height: 90vh;
  }
}`;
}

/**
 * Generate JavaScript for the viewer
 * Includes month and year organization, stats display, and comment modal
 */
export function generateViewerJS(): string {
  return `// Peach Archive Viewer Script
function initializeArchiveViewer() {
  const timeline = document.getElementById('timeline');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const visiblePostsCounter = document.getElementById('visible-posts');
  
  // Embed the data right in the HTML file to make it completely self-contained
  // The placeholder ARCHIVE_DATA_JSON will be replaced with actual JSON data
  const archiveData = ARCHIVE_DATA_JSON;
  
  // Store sorted posts for filtering
  let sortedPosts = [];
  
  // Create modal elements
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';

  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-container';

  modalOverlay.appendChild(modalContainer);
  document.body.appendChild(modalOverlay);

  // Create modal close functionality
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  function closeModal() {
    modalOverlay.classList.remove('active');
  }

  // Generate a color based on string (for avatar placeholders)
  function stringToColor(str) {
    if (!str) return '#FF98A8'; // Default peach color

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
  }

  // Show comments modal
  function showCommentsModal(post) {
    // Set up modal content
    modalContainer.innerHTML = \`
      <div class="modal-header">
        <h3 class="modal-title">Comments (\${post.comments ? post.comments.length : 0})</h3>
        <button class="close-button" onclick="document.querySelector('.modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-content">
        <div class="comment-list">
          \${post.comments && post.comments.length > 0 ?
            post.comments.map(comment => \`
              <div class="comment">
                <div class="comment-author">
                  \${comment.author.avatarSrc
                    ? \`<img src="media/\${getAuthorAvatarFilename(comment.author.avatarSrc)}" alt="\${comment.author.displayName || comment.author.name}" class="author-avatar">\`
                    : \`<div class="avatar-placeholder" style="background-color: \${stringToColor(comment.author.name)}">\${(comment.author.displayName || comment.author.name || '?').charAt(0)}</div>\`
                  }
                  \${comment.author.displayName || comment.author.name}
                </div>
                <div class="comment-body">\${comment.body}</div>
              </div>
            \`).join('') :
            '<div class="comment">No comments on this post.</div>'}
        </div>
      </div>
    \`;

    // Show the modal
    modalOverlay.classList.add('active');
  }

  // Show full-screen image modal
  function showImageModal(imageSrc) {
    modalContainer.className = 'image-modal-container';

    // Set up modal content
    modalContainer.innerHTML = \`
      <button class="image-close-button" onclick="document.querySelector('.modal-overlay').classList.remove('active')">&times;</button>
      <img src="\${imageSrc}" alt="Full-screen image" class="fullscreen-image">
    \`;

    // Show the modal
    modalOverlay.classList.add('active');
  }

  // Return container to original state when closing
  modalOverlay.addEventListener('click', function() {
    modalContainer.className = 'modal-container';
  });

  // Helper function to get avatar filename
  function getAuthorAvatarFilename(avatarSrc) {
    if (!avatarSrc) return '';
    const parts = avatarSrc.split('/');
    return parts[parts.length - 1];
  }
  
  // Format date for display
  function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    // Check if timestamp is in seconds or milliseconds
    const dateObj = timestamp > 9999999999 
      ? new Date(timestamp) // Already in milliseconds
      : new Date(timestamp * 1000); // Convert from seconds to milliseconds
      
    return dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Display the posts
  initializeViewer();
  
  // Initialize the viewer and set up event listeners
  function initializeViewer() {
    if (!archiveData || !archiveData.posts || archiveData.posts.length === 0) {
      timeline.innerHTML = '<div class="empty-timeline">No posts found in this archive.</div>';
      return;
    }
    
    // Sort posts by creation time (newest first)
    sortedPosts = [...archiveData.posts].sort((a, b) => b.createdTime - a.createdTime);
    
    // Populate year dropdown
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const years = new Set();
    
    sortedPosts.forEach(post => {
      if (post.createdTime) {
        const date = new Date(post.createdTime * 1000);
        years.add(date.getFullYear());
      }
    });
    
    // Sort years descending
    const sortedYears = [...years].sort((a, b) => b - a);
    
    // Add year options
    sortedYears.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
    
    // Display all posts initially
    displayPosts(sortedPosts);
    updateVisiblePostsCount(sortedPosts.length);
    
    // Set up event listeners
    searchBtn.addEventListener('click', filterPosts);
    resetBtn.addEventListener('click', resetFilter);
    
    yearSelect.addEventListener('change', function() {
      filterPosts();
    });
    
    monthSelect.addEventListener('change', function() {
      filterPosts();
    });
    
    // Also allow pressing Enter in the search input
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        filterPosts();
      }
    });
    
    // Calculate fun stats
    calculateFunStats(sortedPosts);
  }
  
  // Calculate and display fun stats
  function calculateFunStats(posts) {
    // Log some debug information to the console for easier troubleshooting
    console.log('Calculating stats for', posts.length, 'posts');
    
    if (!posts || posts.length === 0) return;
    
    // 1. Emoji extraction and counting
    const emojiRegex = /[\\p{Emoji}]/gu;
    let allEmojis = [];
    let totalEmojiCount = 0;
    let wordCount = 0;
    let totalChars = 0;
    let activeDays = {};
    
    posts.forEach(post => {
      // Extract message content
      let messageContent = '';
      
      if (post.message) {
        if (typeof post.message === 'string') {
          messageContent = post.message;
        } else if (Array.isArray(post.message)) {
          post.message.forEach(part => {
            if (part && part.type === 'text' && part.text) {
              messageContent += part.text + ' ';
            }
          });
        }
      }
      
      // Count words and characters
      if (messageContent) {
        // Count words (crude approximation)
        const words = messageContent.split(/\\s+/).filter(w => w.length > 0);
        wordCount += words.length;
        
        // Count characters
        totalChars += messageContent.length;
        
        // Extract emojis
        const emojis = messageContent.match(emojiRegex) || [];
        allEmojis = allEmojis.concat(emojis);
        totalEmojiCount += emojis.length;
      }
      
      // Track activity by date
      if (post.createdTime) {
        const date = new Date(post.createdTime * 1000);
        const dateKey = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
        
        if (!activeDays[dateKey]) {
          activeDays[dateKey] = 0;
        }
        
        activeDays[dateKey]++;
      }
    });
    
    // Update emoji count
    document.getElementById('emoji-count').textContent = totalEmojiCount;
    
    // Update active days count
    const activeDaysCount = Object.keys(activeDays).length;
    document.getElementById('active-days').textContent = activeDaysCount;
    
    // Count emoji frequency
    const emojiFrequency = {};
    allEmojis.forEach(emoji => {
      if (!emojiFrequency[emoji]) {
        emojiFrequency[emoji] = 0;
      }
      emojiFrequency[emoji]++;
    });
    
    // Sort and display top emojis
    const topEmojis = Object.entries(emojiFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const emojiListEl = document.querySelector('#top-emojis .emoji-list');
    if (topEmojis.length > 0) {
      emojiListEl.innerHTML = topEmojis.map(function(item) {
        var emoji = item[0];
        var count = item[1];
        return '<div class="emoji-item">' + emoji + '<span class="emoji-count">' + count + '</span></div>';
      }).join('');
    } else {
      emojiListEl.innerHTML = 'No emojis found in your posts.';
    }
    
    // Display word stats
    const wordStatsEl = document.querySelector('#word-count .word-stats');
    wordStatsEl.innerHTML = 
      '<p>Total words: <strong>' + wordCount + '</strong></p>' +
      '<p>Total characters: <strong>' + totalChars + '</strong></p>' +
      '<p>Average words per post: <strong>' + Math.round(wordCount / posts.length) + '</strong></p>';
    
    // Display activity data
    // We already have activeDaysCount defined above
    const mostActiveDay = Object.entries(activeDays)
      .sort((a, b) => b[1] - a[1])[0];
    
    const activityDataEl = document.querySelector('#activity-chart .activity-data');
    
    if (mostActiveDay) {
      const [dateKey, count] = mostActiveDay;
      const [year, month, day] = dateKey.split('-').map(Number);
      const dateObj = new Date(year, month, day);
      const formattedDate = dateObj.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      
      activityDataEl.innerHTML = 
        '<p>Active days: <strong>' + activeDaysCount + '</strong></p>' +
        '<p>Most active day: <strong>' + formattedDate + '</strong> with ' + count + ' posts</p>' +
        '<p>Average posts per active day: <strong>' + Math.round(posts.length / activeDaysCount) + '</strong></p>';
    } else {
      activityDataEl.innerHTML = 'No activity data available.';
    }
  }
  
  // Filter posts based on selected criteria
  function filterPosts() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedYear = document.getElementById('year-select').value;
    const selectedMonth = document.getElementById('month-select').value;
    
    // Start with all posts
    let filteredPosts = [...sortedPosts];
    
    // Apply year filter
    if (selectedYear) {
      filteredPosts = filteredPosts.filter(post => {
        if (!post.createdTime) return false;
        const postDate = new Date(post.createdTime * 1000);
        return postDate.getFullYear().toString() === selectedYear;
      });
    }
    
    // Apply month filter
    if (selectedMonth) {
      filteredPosts = filteredPosts.filter(post => {
        if (!post.createdTime) return false;
        const postDate = new Date(post.createdTime * 1000);
        return postDate.getMonth().toString() === selectedMonth;
      });
    }
    
    // Apply search term filter
    if (searchTerm) {
      filteredPosts = filteredPosts.filter(post => {
        // Extract message content for searching
        let messageContent = '';
        
        if (post.message) {
          if (typeof post.message === 'string') {
            messageContent = post.message.toLowerCase();
          } else if (Array.isArray(post.message)) {
            post.message.forEach(part => {
              if (part && part.type === 'text' && part.text) {
                messageContent += part.text.toLowerCase() + ' ';
              }
            });
          }
        }
        
        return messageContent.includes(searchTerm);
      });
    }
    
    // Display filtered posts
    displayPosts(filteredPosts);
    calculateFunStats(filteredPosts);
  }
  
  // Reset all filters
  function resetFilter() {
    searchInput.value = '';
    document.getElementById('year-select').selectedIndex = 0;
    document.getElementById('month-select').selectedIndex = 0;
    displayPosts(sortedPosts);
    calculateFunStats(sortedPosts);
  }
  
  // Update the visible posts counter
  function updateVisiblePostsCount(count) {
    if (visiblePostsCounter) {
      visiblePostsCounter.textContent = count;
    }
  }
  
  // Display posts in the timeline with month/year organization
  function displayPosts(posts) {
    // Clear timeline
    timeline.innerHTML = '';
    
    if (posts.length === 0) {
      timeline.innerHTML = '<div class="empty-timeline">No posts found for the selected filters. Try different filters or reset.</div>';
      return;
    }
    
    // Group posts by year and month
    const groupedPosts = {};
    
    posts.forEach(post => {
      if (!post.createdTime) return;
      
      const postDate = new Date(post.createdTime * 1000);
      const year = postDate.getFullYear();
      const month = postDate.getMonth();
      
      if (!groupedPosts[year]) {
        groupedPosts[year] = {};
      }
      
      if (!groupedPosts[year][month]) {
        groupedPosts[year][month] = [];
      }
      
      groupedPosts[year][month].push(post);
    });
    
    // Sort years (descending) and display posts
    const years = Object.keys(groupedPosts).sort((a, b) => b - a);
    
    years.forEach(year => {
      // Sort months descending (Dec to Jan)
      const months = Object.keys(groupedPosts[year]).sort((a, b) => b - a);
      
      months.forEach(month => {
        const monthPosts = groupedPosts[year][month];
        if (monthPosts.length === 0) return;
        
        // Create month/year header
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-year-header';
        
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        monthHeader.textContent = monthNames[month] + ' ' + year + ' (' + monthPosts.length + ' posts)';
        monthHeader.dataset.year = year;
        monthHeader.dataset.month = month;
        
        timeline.appendChild(monthHeader);
        
        // Add posts for this month
        monthPosts.forEach(post => {
          const postElement = createPostElement(post);
          postElement.dataset.year = year;
          postElement.dataset.month = month;
          timeline.appendChild(postElement);
        });
      });
    });
    
    // Update visible posts counter
    updateVisiblePostsCount(posts.length);
  }
  
  // Create an HTML element for a post
  function createPostElement(post) {
    const postElement = document.createElement('article');
    postElement.className = 'post';
    postElement.setAttribute('data-id', post.id);
    
    try {
      // Format the post date - handle potential timestamp format issues
      let postDate;
      let dateForAttribute = '';
      const timestamp = post.createdTime;
      
      if (timestamp) {
        // Check if it's in seconds (Peach API) or milliseconds
        const dateObj = timestamp > 9999999999 
          ? new Date(timestamp) // Already in milliseconds
          : new Date(timestamp * 1000); // Convert from seconds to milliseconds
        
        // Format date for displaying
        postDate = dateObj.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Format date for data attribute (for filtering)
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        dateForAttribute = year + '-' + month + '-' + day;
      } else {
        postDate = 'Unknown date';
      }
      
      // Store date as data attribute for filtering
      postElement.setAttribute('data-date', dateForAttribute);
      
      // Extract media from message and identify all possible image sources
      let mediaFromMessage = [];
      if (Array.isArray(post.message)) {
        mediaFromMessage = post.message.filter(item => item.type === 'image' && item.src);
      }
      
      // Create post HTML structure
      postElement.innerHTML = \`
        <div class="post-header">
          <span class="post-date">\${postDate}</span>
          <span class="post-id">#\${post.id}</span>
        </div>
        <div class="post-content">\${formatMessage(post.message)}</div>
        \${createPostMediaHtml(post, mediaFromMessage)}
        <div class="post-footer">
          <div class="post-stats">
            \${post.likeCount ? \`<span class="likes">❤️ \${post.likeCount}</span>\` : ''}
            \${post.commentCount ? \`<span class="comments comments-link">💬 \${post.commentCount}</span>\` : ''}
          </div>
        </div>
      \`;

      // Only show comments modal when clicking on the comments link
      const commentsLink = postElement.querySelector('.comments-link');
      if (commentsLink) {
        commentsLink.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent post click event
          showCommentsModal(post);
        });
      }
      
    } catch (error) {
      console.error('Error creating post element:', error, post);
      postElement.innerHTML = \`
        <div class="post-error">
          <div class="post-header">Error displaying post #\${post.id || 'unknown'}</div>
        </div>
      \`;
    }
    
    return postElement;
  }
  
  // Create the media HTML for a post
  function createPostMediaHtml(post, mediaFromMessage) {
    // Check all possible sources of media in order of priority
    let mediaContent = '';
    let mediaCount = 0;

    // Count total media items
    if (post.localMediaPaths && post.localMediaPaths.length > 0) {
      mediaCount = post.localMediaPaths.length;
    } else if (post.media && post.media.length > 0) {
      mediaCount = post.media.length;
    } else if (mediaFromMessage && mediaFromMessage.length > 0) {
      mediaCount = mediaFromMessage.length;
    }

    // Apply full-width class for posts with multiple media items
    const layoutClass = mediaCount > 1 ? 'full-width-media' : '';

    // 1. First check local media paths from the archive
    if (post.localMediaPaths && post.localMediaPaths.length > 0) {
      mediaContent = createMediaElements(post.localMediaPaths);
    }
    // 2. Then check the post.media array
    else if (post.media && post.media.length > 0) {
      mediaContent = createMediaElementsFromMedia(post.media, post.id);
    }
    // 3. Finally check for media elements inside the message array
    else if (mediaFromMessage && mediaFromMessage.length > 0) {
      mediaContent = createMediaElementsFromMessageMedia(mediaFromMessage, post.id);
    }

    // Return the media HTML with appropriate class
    return mediaContent ? '<div class="post-media ' + layoutClass + '">' + mediaContent + '</div>' : '';
  }
  
  // Format the message content for display with error handling
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
          return \`
            <div class="media-item">
              <video controls>
                <source src="\${mediaPath}" type="video/\${path.endsWith('.mp4') ? 'mp4' : 'webm'}">
                Your browser does not support the video tag.
              </video>
            </div>
          \`;
        } else {
          return \`
            <div class="media-item">
              <img src="\${mediaPath}" alt="Post media" loading="lazy" onclick="showImageModal('\${mediaPath}')">
            </div>
          \`;
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

        // Get file extension from URL
        const url = media.url;
        const ext = url.split('.').pop()?.toLowerCase() || '';
        const isVideo = ext === 'mp4' || ext === 'webm';

        // If we have a post ID, use the new naming scheme
        let filename = '';
        if (postId) {
          // Replicate the same naming logic used in generateMediaFilename
          const shortPostId = postId.substring(0, 8);
          const paddedIndex = String(index).padStart(2, '0');
          filename = 'post_' + shortPostId + '_img_' + paddedIndex + '.' + (ext || 'jpg');
        } else {
          // Fallback to old naming scheme
          filename = 'media_' + String(index).padStart(3, '0') + '.' + (ext || 'jpg');
        }

        const mediaPath = 'media/' + filename;

        if (isVideo) {
          return \`
            <div class="media-item">
              <video controls>
                <source src="\${mediaPath}" type="video/\${ext}">
                Your browser does not support the video tag.
              </video>
            </div>
          \`;
        } else {
          return \`
            <div class="media-item">
              <img src="\${mediaPath}" alt="Post media" loading="lazy" onclick="showImageModal('\${mediaPath}')">
            </div>
          \`;
        }
      }).join('');
    } catch (error) {
      console.error('Error creating media elements from media objects:', error);
      return '<div class="media-error">Error displaying media</div>';
    }
  }

  // Create HTML elements from media items in the message array
  function createMediaElementsFromMessageMedia(mediaItems, postId) {
    if (!mediaItems || !Array.isArray(mediaItems)) return '';

    try {
      return mediaItems.map((media, index) => {
        if (!media || !media.src) return '';

        // Get file extension from URL
        const url = media.src;
        const ext = url.split('.').pop()?.toLowerCase() || '';
        const isVideo = ext === 'mp4' || ext === 'webm';

        // If we have a post ID, use the new naming scheme
        let filename = '';
        if (postId) {
          // Replicate the same naming logic used in generateMediaFilename
          const shortPostId = postId.substring(0, 8);
          const paddedIndex = String(index).padStart(2, '0');
          filename = 'post_' + shortPostId + '_img_' + paddedIndex + '.' + (ext || 'jpg');
        } else {
          // Fallback to old naming scheme
          filename = 'media_' + String(index).padStart(3, '0') + '.' + (ext || 'jpg');
        }

        const mediaPath = 'media/' + filename;

        if (isVideo) {
          return \`
            <div class="media-item">
              <video controls>
                <source src="\${mediaPath}" type="video/\${ext}">
                Your browser does not support the video tag.
              </video>
            </div>
          \`;
        } else {
          return \`
            <div class="media-item">
              <img src="\${mediaPath}" alt="Post media" loading="lazy" onclick="showImageModal('\${mediaPath}')">
            </div>
          \`;
        }
      }).join('');
    } catch (error) {
      console.error('Error creating media elements from message media:', error);
      return '<div class="media-error">Error displaying media</div>';
    }
  }
});`;
}

// Export the functions for import elsewhere
export default {
  generateViewerCSS,
  generateViewerJS
};