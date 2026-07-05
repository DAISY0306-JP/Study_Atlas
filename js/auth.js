const authConfig = window.STUDY_ATLAS_CONFIG;
const supabaseClient = window.supabase.createClient(
  authConfig.SUPABASE_URL,
  authConfig.SUPABASE_ANON_KEY
);

const authScreen = document.getElementById("authScreen");
const appRoot = document.querySelector(".app");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authError = document.getElementById("authError");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const logoutBtn = document.getElementById("logoutBtn");

function setAuthError(message) {
  authError.textContent = message || "";
}

function showApp() {
  authScreen.hidden = true;
  appRoot.hidden = false;
}

function showAuth() {
  authScreen.hidden = false;
  appRoot.hidden = true;
}

signInBtn.addEventListener("click", async () => {
  setAuthError("");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) setAuthError(error.message);
});

signUpBtn.addEventListener("click", async () => {
  setAuthError("");

  const { error } = await supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) {
    setAuthError(error.message);
  } else {
    setAuthError("確認メールを送信しました。メール内のリンクを開いてからログインしてください。");
  }
});

logoutBtn?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  window.studyAtlasSession = session;
  document.dispatchEvent(new CustomEvent("study-atlas:session-changed", { detail: session }));

  if (session) {
    showApp();
  } else {
    showAuth();
  }
});

window.getAccessToken = () => window.studyAtlasSession?.access_token || null;
