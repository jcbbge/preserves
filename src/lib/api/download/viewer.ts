/**
 * Viewer generation functions for Peach Archive
 * These functions generate the CSS and JS for the viewer.html file
 */

/**
 * Generate CSS for the viewer
 */
export function generateViewerCSS(): string {
  // Peach Archive Viewer Styles
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
}`;
}

/**
 * Generate JavaScript for the viewer
 * Includes month and year organization and stats display
 */
export function generateViewerJS(): string {
  return `// Peach Archive Viewer Script
document.addEventListener('DOMContentLoaded', function() {
  const timeline = document.getElementById('timeline');
  const searchInput = document.getElementById('search-input');
  const dateFilter = document.getElementById('date-filter');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const visiblePostsCounter = document.getElementById('visible-posts');
  
  // Embed the data right in the HTML file to make it completely self-contained
  // The placeholder ARCHIVE_DATA_JSON will be replaced with actual JSON data
  const archiveData = ARCHIVE_DATA_JSON;
  
  // Store sorted posts for filtering
  let sortedPosts = [];
  
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
    
    // Find posts with media for debugging
    const postsWithMedia = posts.filter(post => 
      (post.localMediaPaths && post.localMediaPaths.length > 0) || 
      (post.media && post.media.length > 0)
    );
    
    // Log media posts info to console - this is safer than trying to modify the DOM
    console.log('Found', postsWithMedia.length, 'posts with media');
    postsWithMedia.forEach(post => {
      console.log('Post ID:', post.id);
      console.log('Local media paths:', post.localMediaPaths || []);
      console.log('Media count:', post.media ? post.media.length : 0);
    });
    
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
  
  // Setup the date filter with appropriate min/max dates
  function setupDateFilter() {
    try {
      // Find earliest and latest post dates
      let earliestTimestamp = Infinity;
      let latestTimestamp = 0;
      
      sortedPosts.forEach(post => {
        if (post.createdTime) {
          const timestamp = post.createdTime;
          
          if (timestamp < earliestTimestamp) {
            earliestTimestamp = timestamp;
          }
          
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
          }
        }
      });
      
      // Convert to Date objects
      const earliestDate = new Date(earliestTimestamp * 1000);
      const latestDate = new Date(latestTimestamp * 1000);
      
      // Format as YYYY-MM-DD for input[type="date"]
      const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return \`\${year}-\${month}-\${day}\`;
      };
      
      // Set min and max dates for the input
      dateFilter.min = formatDateForInput(earliestDate);
      dateFilter.max = formatDateForInput(latestDate);
      
      // Set placeholder
      dateFilter.setAttribute('placeholder', 'Select a date to filter posts');
    } catch (error) {
      console.error('Error setting up date filter:', error);
    }
  }
  
  // Search and filter posts by content and date
  function filterByDate() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedDate = dateFilter.value;
    
    if (!searchTerm && !selectedDate) {
      alert('Please enter a search term or select a date');
      return;
    }
    
    try {
      // Prepare date filter if selected
      let selectedTimestamp = null;
      if (selectedDate) {
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        selectedTimestamp = selectedDateObj.getTime() / 1000;
      }
      
      // Filter posts based on search term and/or date
      const filteredPosts = sortedPosts.filter(post => {
        // Check date filter
        let matchesDate = true;
        if (selectedTimestamp) {
          if (!post.createdTime) return false;
          
          // Convert post timestamp to date object
          const postDate = new Date(post.createdTime * 1000);
          postDate.setHours(0, 0, 0, 0);
          const postTimestamp = postDate.getTime() / 1000;
          
          // Check if post date matches selected date
          matchesDate = postTimestamp === selectedTimestamp;
        }
        
        // Check content filter
        let matchesContent = true;
        if (searchTerm) {
          matchesContent = false;
          
          // Search in message content
          if (post.message) {
            if (Array.isArray(post.message)) {
              for (const msg of post.message) {
                if (msg.type === 'text' && msg.text && msg.text.toLowerCase().includes(searchTerm)) {
                  matchesContent = true;
                  break;
                }
              }
            } else if (typeof post.message === 'string' && post.message.toLowerCase().includes(searchTerm)) {
              matchesContent = true;
            }
          }
        }
        
        return matchesDate && matchesContent;
      });
      
      // Display filtered posts
      displayPosts(filteredPosts);
      updateVisiblePostsCount(filteredPosts.length);
      
      // Scroll to top
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error filtering posts:', error);
      alert('Error filtering posts. Please try again.');
    }
  }
  
  // Reset all filters
  function resetFilter() {
    // Clear all inputs
    searchInput.value = '';
    dateFilter.value = '';
    
    // Display all posts
    displayPosts(sortedPosts);
    updateVisiblePostsCount(sortedPosts.length);
    
    // Scroll to top
    window.scrollTo(0, 0);
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
        dateForAttribute = \`\${year}-\${month}-\${day}\`;
      } else {
        postDate = 'Unknown date';
      }
      
      // Store date as data attribute for filtering
      postElement.setAttribute('data-date', dateForAttribute);
      
      // Create post HTML structure
      postElement.innerHTML = \`
        <div class="post-header">
          <span class="post-date">\${postDate}</span>
          <span class="post-id">#\${post.id}</span>
        </div>
        <div class="post-content">\${formatMessage(post.message)}</div>
        \${post.localMediaPaths && post.localMediaPaths.length > 0 
          ? \`<div class="post-media">\${createMediaElements(post.localMediaPaths)}</div>\`
          : (post.media && post.media.length > 0)
            ? \`<div class="post-media">\${createMediaElementsFromMedia(post.media, post.id)}</div>\`
            : ''}
        <div class="post-footer">
          <div class="post-stats">
            \${post.likeCount ? \`<span class="likes">❤️ \${post.likeCount}</span>\` : ''}
            \${post.commentCount ? \`<span class="comments">💬 \${post.commentCount}</span>\` : ''}
          </div>
        </div>
      \`;
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
        
        if (isVideo) {
          return \`
            <div class="media-item">
              <video controls>
                <source src="media/\${path}" type="video/\${path.endsWith('.mp4') ? 'mp4' : 'webm'}">
                Your browser does not support the video tag.
              </video>
            </div>
          \`;
        } else {
          return \`
            <div class="media-item">
              <img src="media/\${path}" alt="Post media" loading="lazy">
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
          // Using string concatenation instead of template literals to avoid syntax issues
          filename = "post_" + shortPostId + "_img_" + paddedIndex + "." + (ext || 'jpg');
        } else {
          // Fallback to old naming scheme
          filename = "media_" + String(index).padStart(3, '0') + "." + (ext || 'jpg');
        }
        
        if (isVideo) {
          // Use string concatenation instead of template literals
          return '<div class="media-item">' +
                 '<video controls>' +
                 '<source src="media/' + filename + '" type="video/' + ext + '">' +
                 'Your browser does not support the video tag.' +
                 '</video>' +
                 '</div>';
        } else {
          // Use string concatenation instead of template literals
          return '<div class="media-item">' +
                 '<img src="media/' + filename + '" alt="Post media" loading="lazy">' +
                 '</div>';
        }
      }).join('');
    } catch (error) {
      console.error('Error creating media elements from media objects:', error);
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