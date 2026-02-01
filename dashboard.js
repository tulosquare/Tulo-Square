// dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            console.log("User logged in:", user.email);
            loadUserData(user.uid);
        } else {
            // No user is signed in
            console.log("No user logged in");
            window.location.href = "login.html";
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        firebase.auth().signOut().then(() => {
            window.location.href = "index.html";
        });
    });
});

function loadUserData(userId) {
    const db = firebase.database();
    
    // Load user's squares
    db.ref('users/' + userId + '/squares').once('value').then((snapshot) => {
        const squares = snapshot.val() || {};
        displayUserSquares(squares);
    });
    
    // Load user profile
    db.ref('users/' + userId).once('value').then((snapshot) => {
        const userData = snapshot.val();
        document.getElementById('heroHeading').textContent = 
            `Welcome back, ${userData?.name || 'Member'}!`;
    });
}

function displayUserSquares(squares) {
    // This will populate the squares section
    const squaresContainer = document.querySelector('.dashboard-squares');
    if (!squaresContainer) return;
    
    let html = '';
    for (const [squareId, square] of Object.entries(squares)) {
        html += `
            <div class="square-item">
                <div class="square-info">
                    <h4>${square.name}</h4>
                    <div class="square-meta">
                        <span>Goal: ZMK ${square.goal}</span>
                        <span>Progress: ${square.progress || 0}%</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    squaresContainer.innerHTML += html;
}