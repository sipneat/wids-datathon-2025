import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Loader, MessageSquare, Users, HelpCircle, Filter, TrendingUp, Pin } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { CommunityPost } from '../components/CommunityPost';
import { Layout } from '../components/Layout';
import { createCommunityPost, createCommunityReply } from '../services/routes';
import { db } from '../services/firebase';

const PAGE_SIZE = 10;

export default function Community({ userProfile }) {
  // State management
  const [initialPosts, setInitialPosts] = useState([]);
  const [extraPosts, setExtraPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedThread, setSelectedThread] = useState('general');
  const [activeTab, setActiveTab] = useState('forum'); // 'forum', 'chat', 'faq'
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [error, setError] = useState(null);
  const initialPostsRef = useRef([]);

  const posts = useMemo(() => [...initialPosts, ...extraPosts], [initialPosts, extraPosts]);

  useEffect(() => {
    initialPostsRef.current = initialPosts;
  }, [initialPosts]);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return 'Just now';
    const diffMs = Date.now() - parsed.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  const normalizeTimestamp = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    return null;
  };

  const normalizePost = (doc) => {
    const data = doc.data();
    const createdAt = normalizeTimestamp(data.createdAt);
    return {
      id: doc.id,
      ...data,
      createdAt,
      user: data.userDisplayName || data.user || 'Anonymous',
      time: data.time || formatRelativeTime(createdAt),
      isPinned: Boolean(data.isPinned),
      replies: []
    };
  };

  const buildPostQuery = (cursor = null, pageSize = PAGE_SIZE) => {
    const filters = [];
    if (selectedRegion !== 'All Regions') {
      filters.push(where('region', '==', selectedRegion));
    }
    if (selectedThread !== 'general') {
      filters.push(where('thread', '==', selectedThread));
    }
    const base = [collection(db, 'communityPosts'), ...filters, orderBy('createdAt', 'desc')];
    if (cursor) {
      return query(...base, startAfter(cursor), limit(pageSize));
    }
    return query(...base, limit(pageSize));
  };

  const fetchReplies = async (postId) => {
    const repliesQuery = query(
      collection(db, 'communityPosts', postId, 'replies'),
      orderBy('createdAt', 'asc'),
      limit(200)
    );
    const snapshot = await getDocs(repliesQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = normalizeTimestamp(data.createdAt);
      return {
        id: doc.id,
        ...data,
        createdAt,
        user: data.userDisplayName || data.user || 'Anonymous',
        time: data.time || formatRelativeTime(createdAt)
      };
    });
  };

  const loadInitialPosts = async () => {
    setIsLoading(true);
    setError(null);
    setExtraPosts([]);
    setLastVisible(null);
    setHasMore(true);

    try {
      const postsQuery = buildPostQuery();
      const snapshot = await getDocs(postsQuery);
      const docs = snapshot.docs;
      const basePosts = docs.map((doc) => normalizePost(doc));
      const repliesSets = await Promise.all(
        basePosts.map((post) => fetchReplies(post.id))
      );
      const hydratedPosts = basePosts.map((post, index) => ({
        ...post,
        replies: repliesSets[index]
      }));

      setInitialPosts(hydratedPosts);
      setLastVisible(docs[docs.length - 1] || null);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Region options based on disaster areas
  const regions = [
    { name: 'All Regions', disaster: 'All Areas', county: 'Multiple Counties' },
    { name: 'Palisades', disaster: 'Palisades Fire', county: 'Los Angeles County' },
    { name: 'Altadena', disaster: 'Eaton Fire', county: 'Los Angeles County' },
    { name: 'Malibu', disaster: 'Franklin Fire', county: 'Los Angeles County' },
    { name: 'Eaton', disaster: 'Eaton Fire', county: 'Los Angeles County' },
    { name: 'Other Areas', disaster: 'Various', county: 'Multiple Counties' }
  ];

  // Discussion threads/categories
  const threads = [
    { id: 'general', name: 'General Discussion', icon: MessageSquare, count: 45 },
    { id: 'housing', name: 'Housing & Shelter', icon: Users, count: 32 },
    { id: 'insurance', name: 'Insurance Help', icon: HelpCircle, count: 28 },
    { id: 'resources', name: 'Resources & Aid', icon: TrendingUp, count: 41 },
    { id: 'emotional', name: 'Emotional Support', icon: MessageSquare, count: 23 }
  ];

  // FAQ data
  const faqs = [
    {
      question: 'How do I apply for FEMA assistance?',
      answer: 'You can apply for FEMA assistance online at DisasterAssistance.gov, by phone at 1-800-621-3362, or through the FEMA mobile app. You\'ll need your address, insurance information, and details about your losses.',
      category: 'Financial Aid',
      helpfulCount: 47
    },
    {
      question: 'Can I get temporary housing assistance?',
      answer: 'Yes, several programs are available: FEMA Temporary Housing Assistance, Red Cross Emergency Shelter, hotel/motel vouchers, and rental assistance programs. Call 211 for local resources or visit your local disaster recovery center.',
      category: 'Housing',
      helpfulCount: 62
    },
    {
      question: 'What if my insurance claim is denied or too low?',
      answer: 'You have the right to appeal. Document everything with photos and receipts. Consider hiring a public adjuster to help negotiate. Many are offering free consultations for fire victims. Legal aid services are also available.',
      category: 'Insurance',
      helpfulCount: 41
    },
    {
      question: 'Where can I find mental health support?',
      answer: 'Free crisis counseling is available through the Disaster Distress Helpline: 1-800-985-5990. Many therapists are offering sliding scale or pro-bono sessions for fire victims. Check with local community centers and churches for support groups.',
      category: 'Mental Health',
      helpfulCount: 38
    }
  ];

  useEffect(() => {
    if (!userProfile?.uid) {
      setInitialPosts([]);
      setExtraPosts([]);
      setHasMore(true);
      setLastVisible(null);
      setIsLoading(false);
      return;
    }
    loadInitialPosts();
  }, [selectedRegion, selectedThread, userProfile?.uid]);

  // POST request to create a new post
  const handlePost = async () => {
    if (!newPost.trim()) return;
    
    setIsPosting(true);
    setError(null);

    const postData = {
      region: selectedRegion,
      thread: selectedThread,
      content: newPost,
      tags: [],
      userDisplayName: userProfile?.name || userProfile?.displayName || 'Anonymous'
    };

    try {
      const data = await createCommunityPost({
        userId: userProfile?.uid,
        payload: postData
      });
      setNewPost('');
      
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  // POST request to add a reply
  const handleReply = async (postId, replyText) => {
    const replyData = {
      content: replyText,
      userDisplayName: userProfile?.name || userProfile?.displayName || 'Anonymous'
    };

    try {
      const data = await createCommunityReply({
        userId: userProfile?.uid,
        postId,
        payload: replyData
      });
      if (!data?.reply) {
        throw new Error('Failed to create reply');
      }
      
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to add reply. Please try again.');
    }
  };

  const handleLoadMore = async () => {
    if (!lastVisible || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);

    try {
      const nextQuery = buildPostQuery(lastVisible, PAGE_SIZE);
      const snapshot = await getDocs(nextQuery);
      const docs = snapshot.docs;
      const basePosts = docs.map((doc) => normalizePost(doc));
      const repliesSets = await Promise.all(
        basePosts.map((post) => fetchReplies(post.id))
      );
      const nextPosts = basePosts.map((post, index) => ({
        ...post,
        replies: repliesSets[index]
      }));

      setExtraPosts((prev) => {
        const existingIds = new Set([
          ...initialPostsRef.current.map((post) => post.id),
          ...prev.map((post) => post.id)
        ]);
        const filtered = nextPosts.filter((post) => !existingIds.has(post.id));
        return [...prev, ...filtered];
      });

      setLastVisible(docs[docs.length - 1] || lastVisible);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more posts:', err);
      setError('Failed to load more posts. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const selectedRegionData = regions.find(r => r.name === selectedRegion) || regions[0];
  const isRefreshing = isLoading && posts.length > 0;

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Region Info */}
        <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Community Support</h1>
          <p className="text-blue-50 text-lg mb-4">
            Connect with others in your area and share recovery resources
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-blue-100">Current Region</p>
              <p className="font-semibold">{selectedRegionData.name}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-blue-100">Disaster Event</p>
              <p className="font-semibold">{selectedRegionData.disaster}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-blue-100">Area</p>
              <p className="font-semibold">{selectedRegionData.county}</p>
            </div>
          </div>
        </div>

        {/* Region and Tab Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {regions.map(region => (
                <option key={region.name} value={region.name}>
                  {region.name} - {region.disaster}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('forum')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'forum'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageSquare className="w-5 h-5 inline mr-2" />
              Forum
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Group Chat
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'faq'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <HelpCircle className="w-5 h-5 inline mr-2" />
              FAQ
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Forum Tab */}
        {activeTab === 'forum' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Thread Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Discussion Threads
                </h3>
                <div className="space-y-2">
                  {threads.map((thread) => {
                    const Icon = thread.icon;
                    return (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThread(thread.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                          selectedThread === thread.id
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{thread.name}</span>
                          </div>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                            {thread.count}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Forum Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* New Post */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-800">
                    Share in {threads.find(t => t.id === selectedThread)?.name || 'General Discussion'}
                  </h3>
                  <button
                    onClick={loadInitialPosts}
                    disabled={isLoading || isLoadingMore}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isLoading || isLoadingMore
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share advice, resources, or ask questions..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  rows="4"
                  disabled={isPosting}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Posting to: <span className="font-medium">{selectedRegion}</span>
                  </p>
                  <button
                    onClick={handlePost}
                    disabled={!newPost.trim() || isPosting}
                    className={`px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                      !newPost.trim() || isPosting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isPosting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-600">Loading posts...</p>
                </div>
              ) : (
                /* Posts List */
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                      <p className="text-gray-600">No posts yet in this thread. Be the first to share!</p>
                    </div>
                  ) : (
                    <>
                      {/* Pinned Posts First */}
                      {posts.filter(p => p.isPinned).map(post => (
                        <div key={post.id} className="relative">
                          <div className="absolute -top-2 -left-2 bg-yellow-500 text-white p-2 rounded-full shadow-lg z-10">
                            <Pin className="w-4 h-4" />
                          </div>
                          <CommunityPost post={post} onReply={handleReply} />
                        </div>
                      ))}
                      {/* Regular Posts */}
                      {posts.filter(p => !p.isPinned).map(post => (
                        <CommunityPost key={post.id} post={post} onReply={handleReply} />
                      ))}
                      {hasMore && (
                        <div className="flex justify-center pt-2">
                          <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isLoadingMore
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                          >
                            {isLoadingMore ? 'Loading...' : 'Load more posts'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Group Chat Tab (Placeholder) */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Group Chat Coming Soon</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Real-time group chat will be available soon. Connect with others in your region for instant support and conversation.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-gray-700">
                <strong>Planned Features:</strong> Real-time messaging, region-specific rooms, direct messaging, file sharing
              </p>
            </div>
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Frequently Asked Questions</h2>
              <p className="text-gray-600">
                Common questions from community members. These are based on the most discussed topics.
              </p>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  <strong>Future Feature:</strong> AI will automatically summarize the most common questions and concerns from community posts.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 flex-1">
                      {faq.question}
                    </h3>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full ml-4">
                      {faq.category}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {faq.answer}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
                      {faq.helpfulCount} people found this helpful
                    </span>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Was this helpful?
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Summary Placeholder */}
            <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                AI-Powered Insights (Coming Soon)
              </h3>
              <p className="text-gray-700 mb-4">
                Our AI will analyze community discussions to automatically identify trending topics, common questions, and helpful resources shared by the community.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Top Concern This Week</p>
                  <p className="text-xs text-gray-600">Insurance claim processing times</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Most Shared Resource</p>
                  <p className="text-xs text-gray-600">FEMA assistance application guide</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Community Sentiment</p>
                  <p className="text-xs text-gray-600">Hopeful and supportive</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}