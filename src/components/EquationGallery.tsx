import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  where,
  deleteDoc,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Heart,
  Eye,
  Copy,
  Search,
  Sparkles,
  Filter,
  Download,
  Share2,
  Bookmark,
  TrendingUp,
  Clock,
  Flame,
  BarChart3,
  Tag,
  User,
  Calendar,
  MoreVertical,
  Edit3,
  Trash2,
  Play,
  ZoomIn,
  Layers,
  Grid
} from 'lucide-react';
import { BlockMath } from 'react-katex';

interface PublishedEquation {
  id: string;
  latex: string;
  name: string;
  description: string;
  field: string;
  userId: string;
  username: string;
  userEmail: string;
  timestamp: any;
  upvotes: number;
  upvotedBy: string[];
  views: number;
  tags: string[];
  bookmarkedBy: string[];
  downloads: number;
  complexity: 'basic' | 'intermediate' | 'advanced';
  lastAccessed?: any;
}

const EquationGallery: React.FC = () => {
  const navigate = useNavigate();
  const [equations, setEquations] = useState<PublishedEquation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending' | 'downloads'>('recent');
  const [copiedId, setCopiedId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEquation, setSelectedEquation] = useState<PublishedEquation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userBookmarks, setUserBookmarks] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'publicEquations'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eqs: PublishedEquation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        eqs.push({ 
          id: doc.id, 
          ...data,
          upvotes: data.upvotes || 0,
          views: data.views || 0,
          downloads: data.downloads || 0,
          upvotedBy: data.upvotedBy || [],
          bookmarkedBy: data.bookmarkedBy || [],
          tags: data.tags || [],
          complexity: data.complexity || 'basic'
        } as PublishedEquation);
      });
      setEquations(eqs);
      setLoading(false);
    });

    // Load user bookmarks if logged in
    if (auth.currentUser) {
      const userBookmarksQuery = query(
        collection(db, 'userBookmarks'),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const bookmarkUnsubscribe = onSnapshot(userBookmarksQuery, (snapshot) => {
        const bookmarks: string[] = [];
        snapshot.forEach((doc) => {
          bookmarks.push(doc.data().equationId);
        });
        setUserBookmarks(bookmarks);
      });

      return () => {
        unsubscribe();
        bookmarkUnsubscribe();
      };
    }

    return () => unsubscribe();
  }, []);

  const handleUpvote = async (equationId: string, upvotedBy: string[]) => {
    if (!auth.currentUser) return;
    const equationRef = doc(db, 'publicEquations', equationId);
    const hasUpvoted = upvotedBy.includes(auth.currentUser.uid);

    try {
      if (hasUpvoted) {
        await updateDoc(equationRef, {
          upvotes: increment(-1),
          upvotedBy: arrayRemove(auth.currentUser.uid),
        });
      } else {
        await updateDoc(equationRef, {
          upvotes: increment(1),
          upvotedBy: arrayUnion(auth.currentUser.uid),
        });
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const handleBookmark = async (equationId: string) => {
    if (!auth.currentUser) return;
    
    const isBookmarked = userBookmarks.includes(equationId);
    const userBookmarkRef = doc(db, 'userBookmarks', `${auth.currentUser.uid}_${equationId}`);
    const equationRef = doc(db, 'publicEquations', equationId);

    try {
      if (isBookmarked) {
        // Remove bookmark
        await deleteDoc(userBookmarkRef);
        await updateDoc(equationRef, {
          bookmarkedBy: arrayRemove(auth.currentUser.uid),
        });
        setUserBookmarks(prev => prev.filter(id => id !== equationId));
      } else {
        // Add bookmark
        await updateDoc(userBookmarkRef, {
          userId: auth.currentUser.uid,
          equationId: equationId,
          timestamp: new Date(),
        });
        await updateDoc(equationRef, {
          bookmarkedBy: arrayUnion(auth.currentUser.uid),
        });
        setUserBookmarks(prev => [...prev, equationId]);
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  };

  const handleDownload = async (equationId: string, latex: string, name: string, field: string, username: string) => {
    const equationRef = doc(db, 'publicEquations', equationId);
    
    // Create download content
    const content = `% ${name || 'Equation'}
% Field: ${field}
% Author: ${username}
% Date: ${new Date().toISOString().split('T')[0]}

\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}

\\[ ${latex} \\]

\\end{document}`;

    // Download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equation-${equationId}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Update download count
    try {
      await updateDoc(equationRef, {
        downloads: increment(1),
      });
    } catch (error) {
      console.error('Error updating download count:', error);
    }
  };

  const handleShare = async (equation: PublishedEquation) => {
    const shareUrl = `${window.location.origin}/?equation=${encodeURIComponent(equation.latex)}&name=${encodeURIComponent(equation.name)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: equation.name,
          text: equation.description,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedId(equation.id);
      setTimeout(() => setCopiedId(''), 2000);
    }
  };

  const handleCopyLatex = (latex: string, id: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleUseEquation = (latex: string) => {
    navigate(`/?equation=${encodeURIComponent(latex)}`);
  };

  const handleViewDetails = (equation: PublishedEquation) => {
    setSelectedEquation(equation);
    setShowDetailModal(true);
    
    // Update view count
    const equationRef = doc(db, 'publicEquations', equation.id);
    updateDoc(equationRef, {
      views: increment(1),
      lastAccessed: new Date(),
    }).catch(error => console.error('Error updating view count:', error));
  };

  const complexityColors = {
    basic: 'text-green-600 bg-green-100',
    intermediate: 'text-yellow-600 bg-yellow-100',
    advanced: 'text-red-600 bg-red-100',
  };

  const fieldIcons = {
    mathematics: '∑',
    physics: '⚛',
    chemistry: '🧪',
    biology: '🧬',
    ml: '🤖',
    engineering: '⚙',
    economics: '💹',
    statistics: '📊',
    'computer-science': '💻',
    quantum: '🔬',
    astronomy: '🌌',
    finance: '💰',
  };

  const filteredEquations = equations
    .filter((eq) => {
      const matchesSearch =
        eq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.latex?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesField = selectedField === 'all' || eq.field === selectedField;
      const matchesComplexity = selectedComplexity === 'all' || eq.complexity === selectedComplexity;
      return matchesSearch && matchesField && matchesComplexity;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.upvotes || 0) - (a.upvotes || 0);
        case 'trending':
          const aScore = (a.upvotes || 0) + (a.views || 0) + (a.downloads || 0);
          const bScore = (b.upvotes || 0) + (b.views || 0) + (b.downloads || 0);
          return bScore - aScore;
        case 'downloads':
          return (b.downloads || 0) - (a.downloads || 0);
        case 'recent':
        default:
          return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
      }
    });

  const getTrendingEquations = () => {
    return [...equations]
      .sort((a, b) => {
        const aScore = (a.upvotes || 0) + (a.views || 0) * 0.5 + (a.downloads || 0) * 2;
        const bScore = (b.upvotes || 0) + (b.views || 0) * 0.5 + (b.downloads || 0) * 2;
        return bScore - aScore;
      })
      .slice(0, 3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-indigo-600" />
              Equation Gallery
            </h1>
            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              {equations.length} equations
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <div className="flex border border-slate-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600'}`}
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Equation
            </button>
          </div>
        </div>
      </header>

      {/* Trending Section */}
      {equations.length > 0 && (
        <div className="container mx-auto px-6 py-6">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Trending Equations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getTrendingEquations().map((eq, index) => (
                <div key={eq.id} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      {fieldIcons[eq.field as keyof typeof fieldIcons] || '📊'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 truncate">{eq.name}</h3>
                  <p className="text-xs text-white/70 truncate">{eq.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span>👁 {eq.views || 0}</span>
                    <span>❤️ {eq.upvotes || 0}</span>
                    <span>📥 {eq.downloads || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      {showFilters && (
        <div className="container mx-auto px-6 py-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Field</label>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Fields</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
                  <option value="ml">Machine Learning</option>
                  <option value="engineering">Engineering</option>
                  <option value="economics">Economics</option>
                  <option value="statistics">Statistics</option>
                  <option value="computer-science">Computer Science</option>
                  <option value="quantum">Quantum Physics</option>
                  <option value="astronomy">Astronomy</option>
                  <option value="finance">Finance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Complexity</label>
                <select
                  value={selectedComplexity}
                  onChange={(e) => setSelectedComplexity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Levels</option>
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="recent">Recent</option>
                  <option value="popular">Popular</option>
                  <option value="trending">Trending</option>
                  <option value="downloads">Downloads</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search equations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-16">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-slate-500 mt-4">Loading equations...</p>
          </div>
        ) : filteredEquations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-md border border-slate-200">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No equations found
            </h3>
            <p className="text-slate-500 mb-4">
              {searchQuery || selectedField !== 'all' || selectedComplexity !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Be the first to publish an equation!'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
            >
              Create Equation
            </button>
          </div>
        ) : (
          <div className={`gap-6 ${viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'flex flex-col space-y-4'}`}
          >
            {filteredEquations.map((eq) => (
              <div
                key={eq.id}
                className={`bg-white rounded-2xl shadow-md border border-slate-100 hover:shadow-xl transition-all group ${
                  viewMode === 'list' ? 'flex items-center p-6' : 'p-4 flex flex-col'
                }`}
              >
                {/* Equation Display */}
                <div className={`text-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent px-2 ${
                  viewMode === 'list' ? 'flex-1 mr-6' : 'flex-1 mb-3'
                }`}>
                  <div className="inline-block max-w-full">
                    <BlockMath
                      math={eq.latex || ''}
                      renderError={(err) => <span className="text-red-500 text-xs">{err.message}</span>}
                    />
                  </div>
                </div>

                {/* Equation Info */}
                <div className={viewMode === 'list' ? 'flex-1' : ''}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-800 text-lg truncate flex-1">
                      {eq.name || 'Untitled'}
                    </h3>
                    <button
                      onClick={() => handleBookmark(eq.id)}
                      className={`p-1 rounded transition-colors ml-2 ${
                        userBookmarks.includes(eq.id) 
                          ? 'text-indigo-600 bg-indigo-50' 
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={userBookmarks.includes(eq.id) ? "Remove bookmark" : "Add bookmark"}
                    >
                      <Bookmark 
                        className={`w-4 h-4 ${
                          userBookmarks.includes(eq.id) ? 'fill-current' : ''
                        }`} 
                      />
                    </button>
                  </div>

                  <p className={`text-sm text-slate-600 mb-3 ${
                    viewMode === 'list' ? 'line-clamp-1' : 'line-clamp-2'
                  }`}>
                    {eq.description || 'No description'}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${complexityColors[eq.complexity] || 'bg-slate-100 text-slate-600'}`}>
                      {eq.complexity || 'basic'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {eq.field}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {eq.username || 'Anonymous'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(eq.timestamp?.seconds * 1000).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpvote(eq.id, eq.upvotedBy || [])}
                        className={`flex items-center gap-1 text-sm ${
                          eq.upvotedBy?.includes(auth.currentUser?.uid || '')
                            ? 'text-red-600'
                            : 'text-slate-500 hover:text-red-600'
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                        {eq.upvotes || 0}
                      </button>

                      <div className="flex items-center gap-1 text-slate-500 text-sm">
                        <Eye className="w-4 h-4" /> {eq.views || 0}
                      </div>

                      <div className="flex items-center gap-1 text-slate-500 text-sm">
                        <Download className="w-4 h-4" /> {eq.downloads || 0}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(eq)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                        title="View Details"
                      >
                        <ZoomIn className="w-4 h-4 text-slate-600" />
                      </button>

                      <button
                        onClick={() => handleCopyLatex(eq.latex, eq.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                        title="Copy LaTeX"
                      >
                        {copiedId === eq.id ? (
                          <span className="text-xs text-green-600">✓</span>
                        ) : (
                          <Copy className="w-4 h-4 text-slate-600" />
                        )}
                      </button>

                      <button
                        onClick={() => handleUseEquation(eq.latex)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                        title="Use Equation"
                      >
                        <Play className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Equation Detail Modal */}
      {showDetailModal && selectedEquation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">{selectedEquation.name}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Equation Preview */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Equation Preview</h3>
                  <div className="text-center text-2xl p-4 bg-white rounded-lg border border-slate-200">
                    <BlockMath math={selectedEquation.latex} />
                  </div>
                </div>

                {/* Equation Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-3">Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Field:</span>
                        <span className="font-medium">{selectedEquation.field}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Complexity:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${complexityColors[selectedEquation.complexity]}`}>
                          {selectedEquation.complexity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Author:</span>
                        <span className="font-medium">{selectedEquation.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Published:</span>
                        <span className="font-medium">
                          {new Date(selectedEquation.timestamp?.seconds * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-3">Description</h3>
                    <p className="text-slate-600">{selectedEquation.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">{selectedEquation.upvotes || 0}</div>
                      <div className="text-xs text-slate-500">Upvotes</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedEquation.views || 0}</div>
                      <div className="text-xs text-slate-500">Views</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedEquation.downloads || 0}</div>
                      <div className="text-xs text-slate-500">Downloads</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleUseEquation(selectedEquation.latex)}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Use Equation
                    </button>
                    <button
                      onClick={() => handleDownload(
                        selectedEquation.id, 
                        selectedEquation.latex, 
                        selectedEquation.name,
                        selectedEquation.field,
                        selectedEquation.username
                      )}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleShare(selectedEquation)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquationGallery;