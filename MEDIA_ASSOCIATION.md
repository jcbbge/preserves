# Media Association Update

## Overview
This update improves how media files are associated with posts in the Peach Archive system. 

## Changes Made

1. **Improved Media Filename Generation**
   - Media files now use a naming scheme that includes the post ID
   - Format: `post_[POST_ID]_img_[INDEX].[EXTENSION]`
   - Example: `post_9fbd0e3b_img_00.jpg`
   - This creates a clear connection between media files and posts

2. **Updated JSON Structure**
   - The `localMediaPaths` property in each post now contains the correct path to the media files
   - This makes it easier for the viewer to find and display media associated with each post

3. **Viewer HTML Improvements**
   - The viewer now uses the post ID when generating media file paths
   - This ensures that when viewing posts, the correct media is displayed

## How It Works

1. **During Download**
   - Each media URL is converted to a local file with a name including the post ID
   - The mapping from URL to filename is stored
   
2. **During Archive Creation**
   - Each post's `localMediaPaths` property is populated with the correct media file paths
   - This creates a direct link between posts and their media in the JSON structure

3. **During Viewing**
   - The viewer uses the `localMediaPaths` property to display media
   - If that property is missing, it can reconstruct the paths using the post ID

## Testing
To verify the fix:
1. Create a new archive
2. Extract it and examine the `/media` folder
3. Open `viewer.html` and confirm that media files appear with the correct posts
4. Check `data.json` to confirm that posts include their `localMediaPaths`
