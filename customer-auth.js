(() => {
  const authStyles = document.createElement("link");
  authStyles.rel = "stylesheet";
  authStyles.href = "customer-auth.css";
  document.head.appendChild(authStyles);

  const SUPABASE_URL = "https://lznalvinoyxesjsncuqv.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PhihFUquAY7-MnN16oMLig_t2h0PFrO";
  let client = null;
  let pendingCheckout = null;

  window.cblAuthUser = null;
  window.cblAuthReady = false;

  function esc(value){
    return String(value || "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  function ensureUi(){
    if(!document.getElementById("cblAuthOverlay")){
      const overlay=document.createElement("div");
      overlay.id="cblAuthOverlay";
      overlay.className="cbl-auth-overlay";
      overlay.innerHTML=`
        <div class="cbl-auth-card" role="dialog" aria-modal="true" aria-labelledby="cblAuthTitle">
          <button class="cbl-auth-close" type="button" aria-label="Close" onclick="cblCloseAuthModal()">×</button>
          <h2 id="cblAuthTitle">Customer Account</h2>
          <p id="cblAuthIntro">Create an account or sign in before submitting an order request.</p>
          <div id="cblAuthSignedIn" style="display:none"></div>
          <div id="cblAuthForm">
            <input id="cblAuthEmail" class="cbl-auth-field" type="email" autocomplete="email" placeholder="Email address">
            <input id="cblAuthPassword" class="cbl-auth-field" type="password" autocomplete="current-password" minlength="8" placeholder="Password (8+ characters)">
            <div class="cbl-auth-actions">
              <button class="cbl-auth-btn cbl-auth-primary" type="button" onclick="cblSignIn()">Sign In</button>
              <button class="cbl-auth-btn cbl-auth-secondary" type="button" onclick="cblCreateAccount()">Create Account</button>
            </div>
          </div>
          <div id="cblAuthStatus" class="cbl-auth-status" aria-live="polite"></div>
        </div>`;
      overlay.addEventListener("click", e => { if(e.target===overlay) window.cblCloseAuthModal(); });
      document.body.appendChild(overlay);
    }

    document.querySelectorAll(".topbar").forEach(header => {
      if(header.querySelector(".cbl-account-nav")) return;
      const cart=header.querySelector(".cart-nav");
      if(!cart) return;
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="cbl-account-nav";
      btn.textContent="Account";
      btn.onclick=window.cblOpenAuthModal;
      header.insertBefore(btn,cart);
    });
    updateUi();
  }

  function setStatus(message, isError=false){
    const el=document.getElementById("cblAuthStatus");
    if(!el) return;
    el.textContent=message || "";
    el.style.color=isError ? "#ffb4b4" : "#bfeeff";
  }

  function updateUi(){
    const user=window.cblAuthUser;
    document.querySelectorAll(".cbl-account-nav").forEach(btn => {
      btn.textContent=user ? "My Account" : "Sign In";
    });
    const form=document.getElementById("cblAuthForm");
    const signed=document.getElementById("cblAuthSignedIn");
    if(!form || !signed) return;
    if(user){
      form.style.display="none";
      signed.style.display="block";
      signed.className="cbl-auth-signedin";
      signed.innerHTML=`<strong>Signed in</strong><br>${esc(user.email)}<div style="margin-top:12px"><button class="cbl-auth-btn cbl-auth-secondary" type="button" onclick="cblSignOut()">Sign Out</button></div>`;
      setStatus("");
    }else{
      form.style.display="block";
      signed.style.display="none";
    }
  }

  window.cblOpenAuthModal=function(){
    ensureUi();
    document.getElementById("cblAuthOverlay")?.classList.add("open");
    if(!window.cblAuthUser) setTimeout(()=>document.getElementById("cblAuthEmail")?.focus(),50);
  };

  window.cblCloseAuthModal=function(){
    document.getElementById("cblAuthOverlay")?.classList.remove("open");
    if(!window.cblAuthUser) pendingCheckout=null;
  };

  window.cblCreateAccount=async function(){
    const email=document.getElementById("cblAuthEmail")?.value.trim();
    const password=document.getElementById("cblAuthPassword")?.value || "";
    if(!email || password.length<8){setStatus("Enter a valid email and a password with at least 8 characters.",true);return;}
    setStatus("Creating your account…");
    const {data,error}=await client.auth.signUp({
      email,password,
      options:{emailRedirectTo:window.location.origin + window.location.pathname}
    });
    if(error){setStatus(error.message,true);return;}
    if(data.session){
      window.cblAuthUser=data.user;
      updateUi();
      setStatus("Account created. You are signed in.");
      finishPendingCheckout();
    }else{
      setStatus("Account created. Check your email to confirm your address, then return here and sign in.");
    }
  };

  window.cblSignIn=async function(){
    const email=document.getElementById("cblAuthEmail")?.value.trim();
    const password=document.getElementById("cblAuthPassword")?.value || "";
    if(!email || !password){setStatus("Enter your email and password.",true);return;}
    setStatus("Signing in…");
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error){setStatus(error.message,true);return;}
    window.cblAuthUser=data.user;
    updateUi();
    setStatus("Signed in.");
    finishPendingCheckout();
  };

  window.cblSignOut=async function(){
    await client.auth.signOut();
    window.cblAuthUser=null;
    updateUi();
    setStatus("Signed out.");
  };

  function finishPendingCheckout(){
    if(!window.cblAuthUser || !pendingCheckout) return;
    const callback=pendingCheckout;
    pendingCheckout=null;
    window.cblCloseAuthModal();
    callback();
    setTimeout(()=>{
      const email=document.querySelector('#cartCheckout [name="Email"]');
      if(email && !email.value) email.value=window.cblAuthUser?.email || "";
    },0);
  }

  window.cblRequireAuthForCheckout=function(callback){
    if(window.cblAuthUser){callback();return true;}
    pendingCheckout=callback;
    window.cblOpenAuthModal();
    setStatus(window.cblAuthReady ? "Please create an account or sign in to continue to checkout." : "Checking account status…");
    return false;
  };

  async function init(){
    if(!window.supabase){setTimeout(init,100);return;}
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data}=await client.auth.getSession();
    window.cblAuthUser=data.session?.user || null;
    window.cblAuthReady=true;
    ensureUi();
    client.auth.onAuthStateChange((_event,session)=>{
      window.cblAuthUser=session?.user || null;
      updateUi();
      if(window.cblAuthUser) finishPendingCheckout();
    });
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
