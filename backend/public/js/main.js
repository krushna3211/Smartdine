// js/main.js (Corrected Version)

document.addEventListener("DOMContentLoaded", () => {
  
  // Find all navbar links that have a '#'
  document.querySelectorAll('.navbar nav a[href^="#"]').forEach(anchor => {
    
    anchor.addEventListener('click', function (e) {
      e.preventDefault(); // Stop the default "jump"
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        // --- THIS IS THE FIX ---
        
        // 1. Find the navbar
        const navbar = document.querySelector('.navbar');
        // 2. Get its height
        const navbarHeight = navbar.offsetHeight;
        
        // 3. Get the target's position relative to the top of the page
        const targetPosition = targetElement.offsetTop;
        
        // 4. Calculate the correct spot to scroll to
        // (Target's position - navbar's height - a little extra space)
        const scrollToPosition = targetPosition - navbarHeight - 20; 

        // 5. Scroll there smoothly
        window.scrollTo({
          top: scrollToPosition,
          behavior: 'smooth'
        });
      }
    });
  });
});