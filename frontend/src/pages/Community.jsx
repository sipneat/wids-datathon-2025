import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { CommunityPost } from '../components/CommunityPost';
import { Layout } from '../components/Layout';

export default function Community({ userProfile }) {
  const [posts, setPosts] = useState([
    {
      id: 1,
      user: 'Sarah M.',
      region: 'Palisades',
      time: '2 hours ago',
      content: 'Just wanted to share that the Red Cross shelter on Main Street has been incredibly helpful. They helped me get temporary housing vouchers and connected me with a FEMA representative. Don\'t hesitate to reach out to them!',
      tags: ['Housing', 'Resources'],
      replies: [
        { user: 'Michael T.', time: '1 hour ago', content: 'Thank you for this! Heading there tomorrow.' }
      ]
    },
    {
      id: 2,
      user: 'James K.',
      region: 'Altadena',
      time: '5 hours ago',
      content: 'For parents looking for schools: Pacific Elementary is accepting displaced students with expedited enrollment. They\'ve been very understanding about missing documents. The counselor there, Ms. Rodriguez, is amazing.',
      tags: ['Schools', 'Children'],
      replies: []
    },
    {
      id: 3,
      user: 'Linda P.',
      region: 'Malibu',
      time: '1 day ago',
      content: 'Important insurance tip: Take photos of EVERYTHING you can remember from your home. Even if you don\'t have receipts, documentation helps. My adjuster said this made a huge difference in my claim.',
      tags: ['Insurance', 'Tips'],
      replies: [
        { user: 'David R.', time: '18 hours ago', content: 'This is great advice. Also keep all hotel and food receipts for ALE claims!' }
      ]
    }
  ]);
  const [newPost, setNewPost] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');

  const regions = ['All Regions', 'Palisades', 'Altadena', 'Malibu', 'Eaton', 'Other Areas'];

  const handlePost = () => {
    if (newPost.trim()) {
      const post = {
        id: posts.length + 1,
        user: userProfile?.name || 'You',
        region: selectedRegion === 'All Regions' ? 'General' : selectedRegion,
        time: 'Just now',
        content: newPost,
        tags: [],
        replies: []
      };
      setPosts([post, ...posts]);
      setNewPost('');
    }
  };

  const handleReply = (postId, replyText) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          replies: [...(post.replies || []), {
            user: userProfile?.name || 'You',
            time: 'Just now',
            content: replyText
          }]
        };
      }
      return post;
    }));
  };

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Community Support</h2>
          <p className="text-gray-600">Connect with others, share experiences, and find support during recovery</p>
        </div>

        {/* New Post */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Share with the community</h3>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {regions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share advice, resources, or ask questions..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
            rows="4"
          />
          <button
            onClick={handlePost}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Post</span>
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map(post => (
            <CommunityPost key={post.id} post={post} onReply={handleReply} />
          ))}
        </div>
      </div>
    </Layout>
  );
}