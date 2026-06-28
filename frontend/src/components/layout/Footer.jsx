import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-blue-500 flex items-center justify-center text-white opacity-80">
              <Brain size={20} />
            </div>
            <span className="font-bold text-lg text-gray-400">Study<span className="text-gray-500">AI</span></span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <Link to="#" className="hover:text-primary-600 transition-colors">Features</Link>
            <Link to="#" className="hover:text-primary-600 transition-colors">Pricing</Link>
            <Link to="#" className="hover:text-primary-600 transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-primary-600 transition-colors">Terms of Service</Link>
          </div>
          
          <div className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} StudyAI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
