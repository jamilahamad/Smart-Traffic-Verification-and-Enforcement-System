// ============================================================
// 404 Not Found Page
// ============================================================
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
export default function NotFoundPage({ onNavigate }) {
    return (<div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-orange-500"/>
        </div>
        
        <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Page Not Found</h2>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => window.history.back()} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 flex items-center justify-center gap-2">
            <ArrowLeft size={18}/>
            Go Back
          </button>
          <button onClick={() => onNavigate('dashboard')} className="px-6 py-2.5 bg-[#0f4c81] text-white rounded-xl font-medium hover:bg-[#0a3d6a] flex items-center justify-center gap-2">
            <Home size={18}/>
            Dashboard
          </button>
        </div>
      </div>
    </div>);
}
