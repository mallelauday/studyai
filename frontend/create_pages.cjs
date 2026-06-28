const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'src/pages/public/LandingPage.jsx', name: 'LandingPage' },
  { path: 'src/pages/auth/Login.jsx', name: 'Login' },
  { path: 'src/pages/auth/Register.jsx', name: 'Register' },
  { path: 'src/pages/dashboard/Overview.jsx', name: 'Overview' },
  { path: 'src/pages/dashboard/UploadMaterial.jsx', name: 'UploadMaterial' },
  { path: 'src/pages/dashboard/AISummaries.jsx', name: 'AISummaries' },
  { path: 'src/pages/dashboard/Flashcards.jsx', name: 'Flashcards' },
  { path: 'src/pages/dashboard/Quizzes.jsx', name: 'Quizzes' },
  { path: 'src/pages/dashboard/StudyPlanner.jsx', name: 'StudyPlanner' },
  { path: 'src/pages/dashboard/Analytics.jsx', name: 'Analytics' },
  { path: 'src/pages/dashboard/Profile.jsx', name: 'Profile' }
];

pages.forEach(page => {
  const content = `export function ${page.name}() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">${page.name}</h1>
      <p>This is the ${page.name} page.</p>
    </div>
  );
}
`;
  fs.mkdirSync(path.dirname(page.path), { recursive: true });
  fs.writeFileSync(page.path, content);
});
console.log('Pages created!');
