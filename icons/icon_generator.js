// This is a generated placeholder icon file.
// In a production environment, you would replace this with your actual icon.
// Generated icon is a solid blue square.

function createCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function drawIcon(canvas, size) {
  const ctx = canvas.getContext('2d');
  
  // Background (blue)
  ctx.fillStyle = '#284775';
  ctx.fillRect(0, 0, size, size);
  
  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, size / 16);
  ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, size - ctx.lineWidth, size - ctx.lineWidth);
  
  // Text "GD"
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size/2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GD', size/2, size/2);
  
  return canvas.toDataURL();
}

// Create icons of different sizes
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const canvas = createCanvas(size);
  const dataUrl = drawIcon(canvas, size);
  
  // In a real extension, you would save these to files
  // For now, we're just demonstrating the concept
  console.log(`Created icon of size ${size}x${size}`);
});

// Note: In a real extension, you would use a graphics editor to create proper icons
// and save them as .png files in the icons directory.
