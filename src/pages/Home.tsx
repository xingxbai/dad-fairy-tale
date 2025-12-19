import { Link } from 'react-router-dom';
import { BookOpen, Mic, Globe, Scroll, Moon } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-primary-50 text-gray-800 font-sans">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-center">
          <h1 className="text-xl font-bold text-primary-900">爸爸的胎教时间</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md space-y-4 pb-10">
        <Link to="/fairy-tale" className="block">
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow flex items-center space-x-4 cursor-pointer border border-transparent hover:border-primary-200">
            <div className="bg-primary-100 p-4 rounded-full">
              <BookOpen className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">安徒生童话</h2>
              <p className="text-gray-500 text-sm">经典童话故事，陪伴宝宝成长</p>
            </div>
          </div>
        </Link>

        <Link to="/english-story" className="block">
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow flex items-center space-x-4 cursor-pointer border border-transparent hover:border-blue-200">
            <div className="bg-blue-100 p-4 rounded-full">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">英文启蒙</h2>
              <p className="text-gray-500 text-sm">纯正英文故事，从小培养语感</p>
            </div>
          </div>
        </Link>

        <Link to="/chinese-classics" className="block">
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow flex items-center space-x-4 cursor-pointer border border-transparent hover:border-amber-200">
            <div className="bg-amber-100 p-4 rounded-full">
              <Scroll className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">国学经典</h2>
              <p className="text-gray-500 text-sm">唐诗宋词三字经，传承中华文化</p>
            </div>
          </div>
        </Link>

        <Link to="/bedtime-story" className="block">
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow flex items-center space-x-4 cursor-pointer border border-transparent hover:border-indigo-200">
            <div className="bg-indigo-100 p-4 rounded-full">
              <Moon className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">晚安故事</h2>
              <p className="text-gray-500 text-sm">温馨睡前故事，哄睡神器</p>
            </div>
          </div>
        </Link>

        <Link to="/custom-text" className="block">
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-shadow flex items-center space-x-4 cursor-pointer border border-transparent hover:border-green-200">
            <div className="bg-green-100 p-4 rounded-full">
              <Mic className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">自定义播放</h2>
              <p className="text-gray-500 text-sm">输入你想说的话，生成语音播放</p>
            </div>
          </div>
        </Link>
      </main>
    </div>
  );
}
