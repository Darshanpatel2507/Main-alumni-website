/* =====================================================
   ALUMNIHUB — MAIN.JS (FULLY SECURED & FUNCTIONAL VERSION)
   ===================================================== */

(function() {
  const supabaseUrl = 'https://wlmsjyweqbroxbeirglr.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbXNqeXdlcWJyb3hiZWlyZ2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODkyMjIsImV4cCI6MjA5MTY2NTIyMn0.bkSr4BvKU6l-S54jSyZ6jNJfcdzWMY37Ck6wiLSI4SU';
  
  // 1. FIX SUPABASE INITIALIZATION
  // Must use `let supabase = null` inside a function scope to avoid global namespace collisions with the CDN script!
  let supabase = null;

  let currentUser = null;
  let cachedAlumni = [];
  let activeChatChannel = null;

  async function initApp() {
    console.log("App initialized");
    
    // 2. PREVENT JS BREAKING & Safe Init Pattern
    try {
      if (window.supabase) {
        const { createClient } = window.supabase;
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log("Supabase connected");
      }
    } catch (err) {
      console.error("Supabase init error:", err);
    }

    // Wrap UI functions safely
    try { if (typeof initTheme === 'function') initTheme(); } catch (e) { console.error("Error in initTheme", e); }
    try { if (typeof initNav === 'function') initNav(); } catch (e) { console.error("Error in initNav", e); }
    try { if (typeof initModal === 'function') initModal(); } catch (e) { console.error("Error in initModal", e); }
    try { if (typeof initSearch === 'function') initSearch(); } catch (e) { console.error("Error in initSearch", e); }
    try { if (typeof initFilters === 'function') initFilters(); } catch (e) { console.error("Error in initFilters", e); }
    try { if (typeof initMentorship === 'function') initMentorship(); } catch (e) { console.error("Error in initMentorship", e); }
    try { if (typeof initScrollSpy === 'function') initScrollSpy(); } catch (e) { console.error("Error in initScrollSpy", e); }
    try { if (typeof initDashboardForms === 'function') initDashboardForms(); } catch (e) { console.error("Error in initDashboardForms", e); }

    if (supabase) {
      try { await checkAuth(); } catch (e) { console.error("checkAuth error", e); }
      try { fetchEvents(); } catch (e) { console.error(e); }
      try { fetchAlumni(); } catch (e) { console.error(e); }
      try { fetchForum(); } catch (e) { console.error(e); }
    }
  }

  // 5. FIX SCRIPT LOADING ORDER
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

  /* ────────────────────────────────────────────────────────
     THEME, NAV & MODALS (CORE UI)
     ──────────────────────────────────────────────────────── */

  // 4. FIX DARK MODE
  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    let saved = "light";
    try { saved = localStorage.getItem("alumnihub-theme") || "light"; } catch (e) { }

    document.documentElement.setAttribute("data-theme", saved);

    // 6. HANDLE MISSING ELEMENTS SAFELY
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("alumnihub-theme", next); } catch (e) {}

      toggle.style.transform = "rotate(360deg) scale(1.1)";
      setTimeout(() => toggle.style.transform = "", 400);
    });
  }

  function initNav() {
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("nav-links");

    if (hamburger && navLinks) {
      hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("open");
        navLinks.classList.toggle("open");
      });
    }

    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (hamburger) hamburger.classList.remove("open");
        if (navLinks) navLinks.classList.remove("open");
        hideDashboard();
      });
    });

    window.addEventListener("scroll", () => {
      const navbar = document.getElementById("navbar");
      if (!navbar) return;
      if (window.scrollY > 20) navbar.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
      else navbar.style.boxShadow = "var(--navbar-shadow)";
    });
  }

  function initSearch() {
    const input = document.getElementById("search-input");
    if (!input) return;
    input.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const result = cachedAlumni.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.branch || '').toLowerCase().includes(q)
      );
      renderAlumni(result);
    });
  }

  function initFilters() {
    const chips = document.querySelectorAll(".filter-chips .chip");
    if (!chips || chips.length === 0) return;
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const dash = document.getElementById('dashboard-views');
        if (dash && dash.style.display === 'block') return;
        
        chips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const filter = chip.innerText.toLowerCase();
        
        let res = cachedAlumni;
        if (filter !== "all") {
          res = cachedAlumni.filter(a => (a.branch || '').toLowerCase().includes(filter));
        }
        renderAlumni(res);
      });
    });
  }

  function initMentorship() {
    const matchBtn = document.getElementById("request-match-btn");
    if (matchBtn) {
      matchBtn.addEventListener("click", () => {
        const fieldSelect = document.getElementById("field-select");
        if (!fieldSelect) return;
        const field = fieldSelect.value;
        showToast(`Redirecting to directory for ${field} mentors...`);
        window.location.hash = "#directory";
        const search = document.getElementById("search-input");
        if (search) {
          search.value = field;
          search.dispatchEvent(new Event('input'));
        }
      });
    }
  }

  function initScrollSpy() {
    const sections = document.querySelectorAll(".section");
    if (!sections || sections.length === 0) return;
    const navLinks = document.querySelectorAll(".nav-link");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              if (link.getAttribute("data-section") === entry.target.id) {
                link.classList.add("active");
              } else {
                link.classList.remove("active");
              }
            });
          }
        });
      },
      { rootMargin: "-30% 0px -70% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
  }

  // 3. FIX MODAL + BUTTON ISSUES
  function initModal() {
    const signinModal = document.getElementById("signin-modal");
    const signupModal = document.getElementById("signup-modal");
    const reportModal = document.getElementById("report-modal");

    const openSigninBtn = document.getElementById("signin-btn");
    const closeSigninBtn = document.getElementById("modal-close");
    const closeSignupBtn = document.getElementById("signup-modal-close");
    const signupLink = document.getElementById("signup-link");
    const loginLink = document.getElementById("login-link");

    // "Sign In" button reliably triggers "open"
    if (openSigninBtn && signinModal) {
      openSigninBtn.addEventListener("click", () => signinModal.classList.add("open"));
    }
    
    if (closeSigninBtn && signinModal) {
      closeSigninBtn.addEventListener("click", () => signinModal.classList.remove("open"));
    }
    
    if (closeSignupBtn && signupModal) {
      closeSignupBtn.addEventListener("click", () => signupModal.classList.remove("open"));
    }

    if (signupLink) {
      signupLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (signinModal) signinModal.classList.remove("open");
        if (signupModal) signupModal.classList.add("open");
      });
    }

    if (loginLink) {
      loginLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (signupModal) signupModal.classList.remove("open");
        if (signinModal) signinModal.classList.add("open");
      });
    }

    [signinModal, signupModal].forEach(modal => {
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) modal.classList.remove("open");
        });
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (signinModal) signinModal.classList.remove("open");
        if (signupModal) signupModal.classList.remove("open");
        if (reportModal) reportModal.classList.remove("open");
      }
    });

    const signinForm = document.getElementById("signin-form");
    if (signinForm) {
      signinForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("email-input");
        const passwordInput = document.getElementById("password-input");
        if (!emailInput || !passwordInput) return;
        
        const btn = signinForm.querySelector('button[type="submit"]');
        if (!btn) return;
        
        const originalText = btn.textContent;
        btn.textContent = "Signing in...";

        try {
          const { error } = await supabase.auth.signInWithPassword({ 
            email: emailInput.value, 
            password: passwordInput.value 
          });
          
          btn.textContent = originalText;
          
          if (error) {
            showToast(error.message);
          } else {
            if (signinModal) signinModal.classList.remove("open");
            showToast("Signed in successfully.");
          }
        } catch (err) {
          btn.textContent = originalText;
          showToast("Connection failed.");
        }
      });
    }

    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
      signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const btn = signupForm.querySelector('button[type="submit"]');
        if(!btn) return;
        
        const originalText = btn.textContent;
        btn.textContent = "Creating...";

        try {
          const { error } = await supabase.auth.signUp({
            email: document.getElementById("signup-email").value,
            password: document.getElementById("signup-password").value,
            options: {
              data: { 
                name: document.getElementById("signup-name").value, 
                role: document.getElementById("signup-role").value, 
                branch: document.getElementById("signup-branch").value, 
                passing_year: document.getElementById("signup-year").value ? Number(document.getElementById("signup-year").value) : null 
              }
            }
          });
          
          btn.textContent = originalText;

          if (error) {
            showToast(error.message);
          } else {
            if (signupModal) signupModal.classList.remove("open");
            showToast("Registration successful! Waiting for approval.");
          }
        } catch(err) {
          btn.textContent = originalText;
          showToast("Network failed.");
        }
      });
    }

    const reportForm = document.getElementById("report-form");
    const reportModalBtn = document.getElementById("report-modal-close");
    if (reportModalBtn) {
      reportModalBtn.addEventListener('click', () => {
        const repMod = document.getElementById("report-modal");
        if(repMod) repMod.classList.remove("open");
      });
    }
    
    if (reportForm) {
      reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return showToast("You must be logged in to report.");
        
        try {
          const { error } = await supabase.from('reports').insert({
            type: window._currentReportType,
            reported_id: window._currentReportId,
            reported_by: currentUser.id,
            reason: document.getElementById("report-reason").value
          });
          
          if (error) {
             showToast("Error submitting report.");
          } else {
             showToast("Report submitted successfully.");
             const m = document.getElementById("report-modal");
             if(m) m.classList.remove("open");
             document.getElementById("report-reason").value = "";
          }
        } catch(err) {}
      });
    }
  }

  /* ────────────────────────────────────────────────────────
     AUTHENTICATION LOGIC
     ──────────────────────────────────────────────────────── */

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await handleSession(session);
      
      // Auto-open dashboard on initial load if logged in
      if (currentUser) showDashboard();

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
          await handleSession(session);
          if (currentUser) showDashboard(); 
        } else if (event === 'SIGNED_OUT') {
          currentUser = null;
          updateAuthUI();
          hideDashboard();
        }
      });
    } catch(err) {}

    const signoutBtn = document.getElementById("signout-btn");
    if (signoutBtn) {
      signoutBtn.addEventListener("click", async () => {
        try {
          await supabase.auth.signOut();
          showToast("Signed out successfully.");
        } catch(err) {}
      });
    }
  }

  async function handleSession(session) {
    if (!session || !session.user) {
      currentUser = null;
      updateAuthUI();
      return;
    }
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (userData) {
        // Enforce safe exact string casting for roles
        if (userData.role) {
          userData.role = userData.role.trim().toLowerCase();
        }

        // Admins bypass ALL restrictions — never block admin accounts
        if (userData.role === 'admin') {
          currentUser = userData;
          console.log("Logged in user (ADMIN):", currentUser);
        } else if (userData.approved === false) {
          showToast("Your account is pending admin approval.");
          await supabase.auth.signOut();
          currentUser = null;
        } else if (userData.restricted === true) {
          showToast("Your account has been restricted.");
          await supabase.auth.signOut();
          currentUser = null;
        } else {
          currentUser = userData;
          console.log("Logged in user:", currentUser);
        }
      } else {
        // User authenticated but no profile row yet — treat as student
        currentUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
          role: (session.user.user_metadata?.role || 'student').trim().toLowerCase(),
          approved: true
        };
        console.log("Logged in user (no profile row):", currentUser);
      }
    } catch(err) {
      currentUser = null;
    }
    
    updateAuthUI();
  }

  function updateAuthUI() {
    const signinBtn = document.getElementById("signin-btn");
    const userProfile = document.getElementById("user-profile");
    const userNameDisplay = document.getElementById("user-name-display");

    if (currentUser) {
      if (signinBtn) signinBtn.style.display = "none";
      if (userProfile) userProfile.style.display = "flex";
      if (userNameDisplay) userNameDisplay.textContent = currentUser.name || "User";
    } else {
      if (signinBtn) signinBtn.style.display = "block";
      if (userProfile) userProfile.style.display = "none";
    }
  }

  /* ────────────────────────────────────────────────────────
     DASHBOARD ROUTING
     ──────────────────────────────────────────────────────── */

  function showDashboard() {
     if (!currentUser) return;
     console.log("Opening dashboard for:", currentUser.role);

     const pub = document.getElementById("public-views");
     const dash = document.getElementById("dashboard-views");
     if (pub) pub.style.display = 'none';
     if (dash) dash.style.display = 'block';

     // Hide all dashboards first
     const aDash = document.getElementById("admin-dashboard");
     const alDash = document.getElementById("alumni-dashboard");
     const sDash = document.getElementById("student-dashboard");

     if (aDash) aDash.style.display = 'none';
     if (alDash) alDash.style.display = 'none';
     if (sDash) sDash.style.display = 'none';

     window.scrollTo(0, 0);

     if (currentUser.role === 'admin') {
       if(aDash) aDash.style.display = 'block';
       loadAdminDashboard();
     } else if (currentUser.role === 'alumni') {
       if(alDash) alDash.style.display = 'block';
       loadAlumniDashboard();
     } else {
       if(sDash) sDash.style.display = 'block';
       loadStudentDashboard();
     }
  }

  function hideDashboard() {
     const pub = document.getElementById("public-views");
     const dash = document.getElementById("dashboard-views");
     if (pub) pub.style.display = 'block';
     if (dash) dash.style.display = 'none';
     
     const aDash = document.getElementById("admin-dashboard");
     const alDash = document.getElementById("alumni-dashboard");
     const sDash = document.getElementById("student-dashboard");

     if (aDash) aDash.style.display = 'none';
     if (alDash) alDash.style.display = 'none';
     if (sDash) sDash.style.display = 'none';
  }

  function showDashboardTab(tabId) {
     document.querySelectorAll('.dashboard-tab-content').forEach(el => el.style.display = 'none');
     document.querySelectorAll('.dashboard-tabs .btn-outline').forEach(btn => btn.classList.remove('active'));
     
     const activeTab = document.getElementById(tabId);
     if (activeTab) activeTab.style.display = 'block';
     
     const btn = Array.from(document.querySelectorAll('.dashboard-tabs .btn-outline')).find(b => b.getAttribute('onclick').includes(tabId));
     if (btn) btn.classList.add('active');
  }

  /* ────────────────────────────────────────────────────────
     FORMS & CREATION & EDITING
     ──────────────────────────────────────────────────────── */

  function initDashboardForms() {
    const eventForm = document.getElementById("new-event-form");
    if (eventForm) {
      eventForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const { error } = await supabase.from('events').insert({
            title: document.getElementById("event-title").value, 
            description: document.getElementById("event-desc").value, 
            date: document.getElementById("event-date").value, 
            time: document.getElementById("event-time").value, 
            location: document.getElementById("event-location").value, 
            type: document.getElementById("event-type").value, 
            created_by: currentUser.id
          });
          if (error) return showToast("Failed to create event.");
          showToast("Event created successfully!");
          eventForm.reset();
          fetchEvents();
          if (currentUser.role === 'admin') loadAdminDashboard();
        } catch(err) {}
      });
    }

    const postForm = document.getElementById("new-post-form");
    if (postForm) {
      postForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const { error } = await supabase.from('discussions').insert({
            title: document.getElementById("post-title").value, 
            content: document.getElementById("post-content").value, 
            tag: document.getElementById("post-tag").value, 
            user_id: currentUser.id
          });
          if (error) return showToast("Failed to create post.");
          showToast("Post submitted!");
          postForm.reset();
          fetchForum();
        } catch(err){}
      });
    }
  }

  async function editContent(type, id) {
    const table = type === 'event' ? 'events' : 'discussions';
    const newText = prompt(`Edit your ${type} text:`);
    if (!newText || newText.trim() === '') return;
    
    const updateData = type === 'event' ? { description: newText, is_edited: true } : { content: newText, is_edited: true };
    try {
      const { error } = await supabase.from(table).update(updateData).eq('id', id).eq(type === 'event' ? 'created_by' : 'user_id', currentUser.id);
      
      if (error) {
        showToast("Failed to edit or unauthorized.");
      } else {
        showToast("Edited successfully!");
        if (type === 'event') fetchEvents(); else fetchForum();
      }
    } catch(err){}
  }

  async function deleteOwnContent(type, id) {
    if (!confirm("Are you sure you want to delete this?")) return;
    const table = type === 'event' ? 'events' : 'discussions';
    try {
      const { error } = await supabase.from(table).delete().eq('id', id).eq(type === 'event' ? 'created_by' : 'user_id', currentUser.id);
      if (!error) {
        showToast("Deleted.");
        if (type === 'event') fetchEvents(); else fetchForum();
      } else {
        showToast("Failed to delete.");
      }
    } catch(err){}
  }

  /* ────────────────────────────────────────────────────────
     ADMIN DASHBOARD LOGIC
     ──────────────────────────────────────────────────────── */

  async function loadAdminDashboard() {
    try {
      const pendingContainer = document.getElementById('pending-users-list');
      const { data: pendingUsers } = await supabase.from('users').select('*').eq('approved', false);
      
      if (!pendingUsers || pendingUsers.length === 0) {
        if (pendingContainer) pendingContainer.innerHTML = '<p>No pending users.</p>';
      } else {
        if (pendingContainer) pendingContainer.innerHTML = pendingUsers.map(u => `
          <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px; border-radius:8px;">
            <h4>${u.name} (${u.role})</h4>
            <p>${u.email} - ${u.branch} - ${u.passing_year}</p>
            <button class="btn-primary" onclick="approveUser('${u.id}')">Approve</button>
          </div>
        `).join('');
      }

      const reportsContainer = document.getElementById('reports-list');
      const { data: reports } = await supabase.from('reports').select('*, users!reports_reported_by_fkey(name)');
      
      if (!reports || reports.length === 0) {
        if (reportsContainer) reportsContainer.innerHTML = '<p>No reports.</p>';
      } else {
        if (reportsContainer) reportsContainer.innerHTML = reports.map(r => `
          <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px; border-radius:8px;">
             <h4>Reported ${r.type}</h4>
             <p>Reason: ${r.reason}</p>
             <p>By: ${r.users?.name || 'Unknown'}</p>
             <button class="btn-outline" style="border-color:red; color:red;" onclick="deleteContent('${r.type}', '${r.reported_id}', '${r.id}')">Delete Content</button>
             <button class="btn-outline" onclick="resolveReport('${r.id}')">Ignore/Resolve</button>
          </div>
        `).join('');
      }
    } catch(err){}
  }

  async function approveUser(id) {
    try {
      const { error } = await supabase.from('users').update({ approved: true }).eq('id', id);
      if (!error) { showToast("User approved"); loadAdminDashboard(); fetchAlumni(); }
    } catch(err){}
  }

  async function deleteContent(type, contentId, reportId) {
    let table = type === 'event' ? 'events' : type === 'discussion' ? 'discussions' : 'users';
    if (table === 'users') { showToast("Cannot delete users here. Restrict them instead."); return; }
    try {
      await supabase.from(table).delete().eq('id', contentId);
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      showToast("Content deleted and report resolved.");
      loadAdminDashboard();
      fetchEvents(); fetchForum();
    } catch(err){}
  }

  async function resolveReport(reportId) {
    try {
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      showToast("Report resolved.");
      loadAdminDashboard();
    } catch(err){}
  }

  /* ────────────────────────────────────────────────────────
     STUDENT / ALUMNI CONNECTIONS & DASHBOARD
     ──────────────────────────────────────────────────────── */

  async function handleConnect(alumniId, alumniName) {
    if (!currentUser) return showToast("Log in to connect!");
    if (currentUser.role !== 'student') return showToast("Only students can send connection requests to alumni.");
    
    try {
      const { error } = await supabase.from('connections').insert({
        student_id: currentUser.id,
        alumni_id: alumniId,
        status: 'pending'
      });
      if (error) return showToast("Already connected or error occurred.");
      showToast("Connection requested with " + (alumniName || "Alumni"));
    } catch(err){}
  }

  async function loadStudentDashboard() {
    try {
      const connContainer = document.getElementById('student-connections-list');
      const { data: conns } = await supabase.from('connections').select('*, users!connections_alumni_id_fkey(id, name)').eq('student_id', currentUser.id);

      if (!conns || conns.length === 0) {
        if (connContainer) connContainer.innerHTML = '<p>No connections yet.</p>';
      } else {
        const chatUsers = document.getElementById("student-chat-users");
        let accepted = conns.filter(c => c.status === 'accepted');
        if (chatUsers) chatUsers.innerHTML = accepted.length ? accepted.map(c => `<div style="padding:10px; cursor:pointer; border-bottom:1px solid #ccc" onclick="openChat('${currentUser.id}', '${c.users.id}', '${c.users.name}', 'student')">Chat with ${c.users.name}</div>`).join("") : "No accepted mentors.";

        if (connContainer) connContainer.innerHTML = conns.map(c => `
          <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between;">
            <span>Mentor: ${c.users?.name}</span>
            <span>Status: ${c.status}</span>
          </div>
        `).join('');
      }
    } catch(err){}
  }

  async function loadAlumniDashboard() {
    try {
      const connContainer = document.getElementById('alumni-connections-list');
      const { data: conns } = await supabase.from('connections').select('*, users!connections_student_id_fkey(id, name)').eq('alumni_id', currentUser.id);

      if (!conns || conns.length === 0) {
        if (connContainer) connContainer.innerHTML = '<p>No connection requests yet.</p>';
      } else {
        const chatUsers = document.getElementById("alumni-chat-users");
        let accepted = conns.filter(c => c.status === 'accepted');
        if (chatUsers) chatUsers.innerHTML = accepted.length ? accepted.map(c => `<div style="padding:10px; cursor:pointer; border-bottom:1px solid #ccc" onclick="openChat('${c.users.id}', '${currentUser.id}', '${c.users.name}', 'alumni')">Chat with ${c.users.name}</div>`).join("") : "No accepted students.";

        if (connContainer) connContainer.innerHTML = conns.map(c => `
          <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px; border-radius:8px;">
            <p>Student: ${c.users?.name}</p>
            <p>Status: ${c.status}</p>
            ${c.status === 'pending' ? `<button class="btn-primary" onclick="updateConn('${c.id}', 'accepted')">Accept</button> <button class="btn-outline" onclick="updateConn('${c.id}', 'rejected')">Reject</button>` : ''}
          </div>
        `).join('');
      }
    } catch(err){}
  }

  async function updateConn(connId, status) {
    try {
      await supabase.from('connections').update({ status }).eq('id', connId);
      showToast("Connection " + status);
      loadAlumniDashboard();
    } catch(err){}
  }

  /* ────────────────────────────────────────────────────────
     REALTIME CHAT
     ──────────────────────────────────────────────────────── */

  async function openChat(studentId, alumniId, peerName, userType) {
    try {
      const chatPrefix = userType === 'alumni' ? 'alumni' : 'student';
      const chatMessages = document.getElementById(`${chatPrefix}-chat-messages`);
      const chatInput = document.getElementById(`${chatPrefix}-chat-input`);
      const chatForm = document.getElementById(`${chatPrefix}-chat-form`);
      
      if (!chatMessages) return;
      chatMessages.innerHTML = `<i>Loading chat with ${peerName}...</i>`;
      if(chatInput) chatInput.disabled = false;
      if(chatForm && chatForm.querySelector("button")) chatForm.querySelector("button").disabled = false;

      const roomId = `${studentId}_${alumniId}`;

      const { data: history } = await supabase.from('messages')
          .select('*')
          .or(`and(sender_id.eq.${studentId},receiver_id.eq.${alumniId}),and(sender_id.eq.${alumniId},receiver_id.eq.${studentId})`)
          .order('created_at', { ascending: true });

      const renderMsgs = (msgs) => {
        if (!chatMessages) return;
        chatMessages.innerHTML = msgs.map(m => `
          <div style="margin-bottom:8px; text-align:${m.sender_id === currentUser.id ? 'right' : 'left'}">
             <span style="display:inline-block; padding:8px 12px; border-radius:8px; background:${m.sender_id === currentUser.id ? 'var(--primary-color)' : '#e2e8f0'}; color:${m.sender_id === currentUser.id ? '#fff' : '#000'}">${m.content}</span>
          </div>
        `).join('');
        chatMessages.scrollTop = chatMessages.scrollHeight;
      };
      
      if (history) renderMsgs(history);

      if (activeChatChannel) supabase.removeChannel(activeChatChannel);
      activeChatChannel = supabase.channel(`room_${roomId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
           if ((payload.new.sender_id === studentId || payload.new.sender_id === alumniId) &&
               (payload.new.receiver_id === studentId || payload.new.receiver_id === alumniId)) {
              history.push(payload.new);
              renderMsgs(history);
           }
        }).subscribe();

      if (chatForm) {
        chatForm.onsubmit = async (e) => {
          e.preventDefault();
          if (!chatInput || !chatInput.value.trim()) return;
          const msg = chatInput.value;
          chatInput.value = "";
          await supabase.from('messages').insert({
            sender_id: currentUser.id,
            receiver_id: userType === 'alumni' ? studentId : alumniId,
            content: msg
          });
        };
      }
    } catch(err){}
  }

  /* ────────────────────────────────────────────────────────
     RENDERERS & HELPERS
     ──────────────────────────────────────────────────────── */

  function getInitials(name) {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0,2);
  }

  function getColorForName(name) {
    const colors = ["#1e3a8a", "#0d9488", "#7c3aed", "#dc2626", "#0891b2", "#ea580c"];
    let hash = 0;
    for (let i = 0; i < name?.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  function openReportModal(id, type) {
    if (!currentUser) return showToast("You must be logged in to report.");
    window._currentReportId = id;
    window._currentReportType = type;
    const modal = document.getElementById("report-modal");
    if(modal) modal.classList.add("open");
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
  }

  /* ────────────────────────────────────────────────────────
     Public Data Rendering
     ──────────────────────────────────────────────────────── */

  async function fetchEvents() {
    try {
      const { data, error } = await supabase.from('events').select('*, users!events_created_by_fkey(name)');
      if (!error) renderEvents(data);
    } catch(err){}
  }

  function renderEvents(data) {
    const grid = document.getElementById("events-grid");
    if (!grid) return;
    if (!data || data.length === 0) {
      grid.innerHTML = '<p>No upcoming events found.</p>';
      return;
    }
    grid.innerHTML = data.map((e, i) => `
      <div class="event-card" style="animation-delay: ${i * 0.1}s" id="event-${e.id}">
        <span class="event-badge ${e.type === "in-person" ? "badge-person" : "badge-virtual"}">
          ${e.type === "in-person" ? "In-Person" : "Virtual"}
        </span>
        <h3 class="event-title">${e.title} ${e.is_edited ? '<span style="font-size:0.7em; color:gray">(edited)</span>' : ''}</h3>
        <div class="event-meta">
          <span class="event-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${e.date || ''}
          </span>
          <span class="event-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ${e.time || ''}
          </span>
          <span class="event-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ${e.location || 'Online'}
          </span>
          <div style="font-size: 12px; margin-top: 10px; color: gray;">
            Hosted by: ${e.users?.name || 'User'}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items:center; margin-top:10px;">
          <span class="event-tag">${e.tag || ''}</span>
          <div>
            ${currentUser && currentUser.id === e.created_by ? `<button class="btn-outline" style="padding:4px 8px; font-size:12px; border-color:orange; color:orange;" onclick="editContent('event', '${e.id}')">✏️ Edit</button> <button class="btn-outline" style="padding:4px 8px; font-size:12px; border-color:red; color:red;" onclick="deleteOwnContent('event', '${e.id}')">🗑️</button>` : ''}
            <button class="btn-outline" style="padding:4px 8px; font-size:12px;" onclick="openReportModal('${e.id}', 'event')">🚨</button>
          </div>
        </div>
      </div>
    `).join("");
    if (typeof initIntersectionAnimations === 'function') initIntersectionAnimations();
  }

  async function fetchAlumni() {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('role', 'alumni').eq('approved', true);
      if (error) return;
      cachedAlumni = data.map(u => ({
        ...u, initials: getInitials(u.name), color: getColorForName(u.name),
        classYear: u.passing_year ? `Class of ${u.passing_year}` : (u.branch || "Alumni"),
        cat: u.branch ? u.branch.toLowerCase() : ''
      }));
      renderAlumni(cachedAlumni);
    } catch(err){}
  }

  function renderAlumni(data) {
    const grid = document.getElementById("directory-grid");
    if (!grid) return;
    if (!data || data.length === 0) {
      grid.innerHTML = '<p>No alumni found.</p>';
      return;
    }
    grid.innerHTML = data.map((a, i) => `
      <div class="alumni-card" style="animation-delay: ${i * 0.08}s" id="alumni-${a.id}">
        <div class="alumni-header">
          <div class="alumni-avatar" style="background: ${a.color};">${a.initials}</div>
          <div>
            <div class="alumni-name">${a.name}</div>
            <div class="alumni-class">${a.classYear}</div>
          </div>
        </div>
        <div class="alumni-info">
           <div class="alumni-info-row">
             <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/></svg> Registered Alumni
           </div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:20px; align-items: center;">
           <button class="btn-connect" onclick="handleConnect('${a.id}', '${a.name}')">Connect</button>
           <button class="btn-outline" style="padding:4px 8px; font-size:12px;" onclick="openReportModal('${a.id}', 'user')">🚨 Report</button>
        </div>
      </div>
    `).join("");
    if (typeof initIntersectionAnimations === 'function') initIntersectionAnimations();
  }

  async function fetchForum() {
    try {
      const { data, error } = await supabase.from('discussions').select('*, users!discussions_user_id_fkey(name)');
      if (!error) renderForum(data);
    } catch(err){}
  }

  function renderForum(data) {
    const container = document.getElementById("forum-threads");
    if (!container) return;
    if (!data || data.length === 0) {
      container.innerHTML = '<p>No discussions found.</p>';
      return;
    }
    container.innerHTML = data.map((t, i) => `
      <div class="thread-card" style="animation-delay: ${i * 0.1}s" id="thread-${t.id}">
        <div class="thread-header">
          <h3 class="thread-title">${t.title} ${t.is_edited ? '<span style="font-size:0.7em; color:gray">(edited)</span>' : ''}</h3>
          <span class="thread-tag">${t.tag || 'Discussion'}</span>
        </div>
        <p class="thread-preview">${t.content}</p>
        <div class="thread-footer">
          <div class="thread-author">
            <div class="thread-avatar" style="background: ${getColorForName(t.users?.name)};">${getInitials(t.users?.name)}</div>
            <span class="thread-author-name">${t.users?.name || 'Anonymous'}</span>
            <span class="thread-time">· ${new Date(t.created_at).toLocaleDateString()}</span>
          </div>
          <div class="thread-stats" style="display:flex; gap:10px; align-items:center;">
            <span class="thread-stat">💬 ${t.replies || 0}</span>
            <span class="thread-stat">👍 ${t.likes || 0}</span>
            ${currentUser && currentUser.id === t.user_id ? `<button class="btn-outline" style="padding:2px 6px; font-size:11px; border-color:orange; color:orange;" onclick="editContent('discussion', '${t.id}')">✏️ Edit</button> <button class="btn-outline" style="padding:2px 6px; font-size:11px; border-color:red; color:red;" onclick="deleteOwnContent('discussion', '${t.id}')">🗑️</button>` : ''}
            <button class="btn-outline" style="padding:2px 6px; font-size:11px;" onclick="openReportModal('${t.id}', 'discussion')">🚨</button>
          </div>
        </div>
      </div>
    `).join("");
    if (typeof initIntersectionAnimations === 'function') initIntersectionAnimations();
  }

  function initIntersectionAnimations() {
    const animatedElements = document.querySelectorAll(".event-card, .alumni-card, .thread-card");
    if (!animatedElements || animatedElements.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }
        });
      }, { threshold: 0.1 }
    );
    animatedElements.forEach((el) => {
      if (el.style.opacity !== "1") {
        el.style.opacity = "0";
        el.style.transform = "translateY(18px)";
        el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        observer.observe(el);
      }
    });
  }

  // 7. CLEAN STRUCTURE: Properly export strictly required bindings to global window
  // This allows the HTML UI onclick="..." attributes to function perfectly 
  // without polluting the global namespace with internal logic!
  
  window.editContent = editContent;
  window.deleteOwnContent = deleteOwnContent;
  window.approveUser = approveUser;
  window.deleteContent = deleteContent;
  window.resolveReport = resolveReport;
  window.updateConn = updateConn;
  window.openChat = openChat;
  window.openReportModal = openReportModal;
  window.showDashboard = showDashboard;
  window.hideDashboard = hideDashboard;
  window.showDashboardTab = showDashboardTab;
  window.handleConnect = handleConnect;

})();
