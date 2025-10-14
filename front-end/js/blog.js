// Blog data - in a real app, this would come from a backend API
const blogPosts = [
  {
    id: 1,
    title: "5 Simple Ways to Save Money Every Month",
    excerpt: "Small daily savings can turn into big yearly amounts. Learn practical tips to cut costs without sacrificing quality of life.",
    category: "savings",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2024-01-15",
    readTime: "7 min read",
    views: "2.4K",
    shares: "84",
    content: "Full article content would go here..."
  },
  {
    id: 2,
    title: "Why Budgeting is the First Step to Financial Freedom",
    excerpt: "A budget is not a restriction, it's your roadmap to smart financial decisions and achieving your money goals.",
    category: "budgeting",
    image: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2024-01-12",
    readTime: "10 min read",
    views: "3.1K",
    shares: "127",
    content: "Full article content would go here..."
  },
  {
    id: 3,
    title: "Beginner's Guide to Investments",
    excerpt: "Stocks, mutual funds, or gold? Here's where to start if you are new to investing and want to build wealth.",
    category: "investing",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2024-01-10",
    readTime: "15 min read",
    views: "5.7K",
    shares: "203",
    content: "Full article content would go here..."
  },
  {
    id: 4,
    title: "How to Get Out of Debt Faster",
    excerpt: "Effective strategies to reduce your debt burden and achieve financial freedom sooner than you think.",
    category: "debt",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2024-01-08",
    readTime: "12 min read",
    views: "4.2K",
    shares: "156",
    content: "Full article content would go here..."
  },
  {
    id: 5,
    title: "Planning for Retirement in Your 30s",
    excerpt: "It's never too early to plan for retirement. Learn how to build a secure financial future starting now.",
    category: "retirement",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2024-01-05",
    readTime: "18 min read",
    views: "3.8K",
    shares: "142",
    content: "Full article content would go here..."
  },
  {
    id: 6,
    title: "Smart Tax Saving Strategies for 2025",
    excerpt: "Maximize your savings with these legal tax strategies that can help you keep more of your hard-earned money.",
    category: "taxes",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2024-01-03",
    readTime: "14 min read",
    views: "6.3K",
    shares: "218",
    content: "Full article content would go here..."
  },
  // Additional blog posts for the blog page
  {
    id: 7,
    title: "The 50/30/20 Rule: A Simple Budgeting Method",
    excerpt: "Learn how to allocate your income effectively using this popular budgeting rule that works for everyone.",
    category: "budgeting",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2024-01-01",
    readTime: "8 min read",
    views: "2.8K",
    shares: "91",
    content: "Full article content would go here..."
  },
  {
    id: 8,
    title: "Emergency Fund: Your Financial Safety Net",
    excerpt: "Why everyone needs an emergency fund and how to build one that can save you during unexpected situations.",
    category: "savings",
    image: "https://images.unsplash.com/photo-1563013541-2dcc13e5ab2a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2023-12-28",
    readTime: "9 min read",
    views: "3.5K",
    shares: "134",
    content: "Full article content would go here..."
  },
  {
    id: 9,
    title: "Understanding Credit Scores and How to Improve Them",
    excerpt: "Demystifying credit scores and providing actionable tips to boost your credit rating.",
    category: "debt",
    image: "https://images.unsplash.com/photo-1563013541-2dcc13e5ab2a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    date: "2023-12-25",
    readTime: "11 min read",
    views: "4.7K",
    shares: "167",
    content: "Full article content would go here..."
  }
];

// Blog functionality
document.addEventListener('DOMContentLoaded', function() {
  const blogGrid = document.getElementById('blogGrid');
  const loadMoreBtn = document.getElementById('loadMore');
  const categoryBtns = document.querySelectorAll('.category-btn');
  
  let currentPage = 1;
  const postsPerPage = 6;
  let currentCategory = 'all';
  let filteredPosts = [...blogPosts];

  // Initial render
  renderBlogPosts();

  // Category filter functionality
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active button
      categoryBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Filter posts
      currentCategory = this.dataset.category;
      currentPage = 1;
      
      if (currentCategory === 'all') {
        filteredPosts = [...blogPosts];
      } else {
        filteredPosts = blogPosts.filter(post => post.category === currentCategory);
      }
      
      renderBlogPosts();
    });
  });

  // Load more functionality
  loadMoreBtn.addEventListener('click', function() {
    currentPage++;
    renderBlogPosts();
    
    // Hide load more button if all posts are loaded
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
    if (currentPage >= totalPages) {
      loadMoreBtn.style.display = 'none';
    }
  });

  function renderBlogPosts() {
    const startIndex = 0; // Always show from beginning for now
    const endIndex = currentPage * postsPerPage;
    const postsToShow = filteredPosts.slice(0, endIndex);
    
    blogGrid.innerHTML = '';
    
    if (postsToShow.length === 0) {
      blogGrid.innerHTML = `
        <div class="col-12 text-center">
          <h3>No articles found in this category</h3>
          <p>Check back later for new content!</p>
        </div>
      `;
      return;
    }
    
    postsToShow.forEach(post => {
      const postElement = createBlogPostElement(post);
      blogGrid.appendChild(postElement);
    });
    
    // Show/hide load more button
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
    loadMoreBtn.style.display = currentPage < totalPages ? 'block' : 'none';
  }

  function createBlogPostElement(post) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6 mb-4';
    
    col.innerHTML = `
      <div class="blog-post-card">
        <div class="blog-post-img">
          <img src="${post.image}" alt="${post.title}">
          <div class="blog-post-category">${post.category.charAt(0).toUpperCase() + post.category.slice(1)}</div>
        </div>
        <div class="blog-post-content">
          <div class="blog-post-meta">
            <span class="blog-post-date">
              <i class="bi bi-calendar"></i>
              ${new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span class="blog-post-read-time">
              <i class="bi bi-clock"></i>
              ${post.readTime}
            </span>
          </div>
          <h3 class="blog-post-title">${post.title}</h3>
          <p class="blog-post-excerpt">${post.excerpt}</p>
          <div class="blog-post-stats">
            <div class="blog-post-views">
              <i class="bi bi-eye"></i>
              ${post.views} views
            </div>
            <div class="blog-post-shares">
              <i class="bi bi-share"></i>
              ${post.shares} shares
            </div>
          </div>
          <a href="#" class="btn-read-more">Read More</a>
        </div>
      </div>
    `;
    
    return col;
  }
});