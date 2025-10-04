// Make blog cards draggable for horizontal scrolling
document.addEventListener('DOMContentLoaded', function() {
  const track = document.querySelector('.blog-scroll-track');
  let isDown = false;
  let startX;
  let scrollLeft;
  
  track.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
    track.style.cursor = 'grabbing';
  });
  
  track.addEventListener('mouseleave', () => {
    isDown = false;
    track.style.cursor = 'grab';
  });
  
  track.addEventListener('mouseup', () => {
    isDown = false;
    track.style.cursor = 'grab';
  });
  
  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fastness
    track.scrollLeft = scrollLeft - walk;
  });
  
  // Touch events for mobile
  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  }, { passive: true });
  
  track.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const x = e.touches[0].pageX - track.offsetLeft;
    const walk = (x - startX) * 2;
    track.scrollLeft = scrollLeft - walk;
  }, { passive: true });
});