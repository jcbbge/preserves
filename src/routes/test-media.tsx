import { createSignal, onMount } from "solid-js";

export default function TestMedia() {
  const [imageUrl, setImageUrl] = createSignal("");
  const [status, setStatus] = createSignal("Loading...");
  
  onMount(async () => {
    try {
      const url = "http://s3.amazonaws.com/assets.peachapi.com/e436a442456945d7a492247cefa736c31671750831.jpg";
      
      // Fetch via the proxy
      const proxyUrl = new URL('/api/media-proxy-direct', window.location.origin);
      proxyUrl.searchParams.append('url', url);
      
      console.log("Fetching from proxy:", proxyUrl.toString());
      setStatus("Fetching image...");
      
      // Use XMLHttpRequest for reliable binary data handling
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Verify the response is a valid blob with content
            if (xhr.response instanceof Blob && xhr.response.size > 0) {
              resolve(xhr.response);
            } else {
              reject(new Error('Empty or invalid blob received'));
            }
          } else {
            reject(new Error(`XHR failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Timeout error'));
        
        xhr.open('GET', proxyUrl.toString(), true);
        xhr.responseType = 'blob';
        xhr.timeout = 30000;
        xhr.send();
      });
      
      // Create a URL for the blob
      const blobUrl = URL.createObjectURL(blob);
      setImageUrl(blobUrl);
      setStatus(`Success! Loaded image (${blob.size} bytes, ${blob.type})`);
      
    } catch (error) {
      console.error("Error loading image:", error);
      setStatus(`Error: ${error.message}`);
    }
  });
  
  return (
    <div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
      <h1>Media Download Test</h1>
      <p>Status: {status()}</p>
      
      {imageUrl() && (
        <div style="margin-top: 2rem;">
          <h2>Image Retrieved Successfully:</h2>
          <img 
            src={imageUrl()} 
            alt="Test image from S3" 
            style="max-width: 100%; border: 1px solid #ccc; border-radius: 4px;"
          />
        </div>
      )}
    </div>
  );
}