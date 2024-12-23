'use client'

import React, { useState, useCallback, useEffect } from 'react';
import { PencilIcon, PlusCircle, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { TimelineModal } from '@/components/TimelineModal';

interface Story {
  id: string;
  title: string | null;
  rawText: string;
  createdAt: { $date: string };
}

const StoryNotes = () => {
  useAuthRedirect();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const loadStories = async () => {
      try {
        const response = await authenticatedFetch('/api/stories');
        if (!response.ok) throw new Error('Failed to fetch stories');
        const data = await response.json();
        if (mounted) {
          setStories(data);
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadStories();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAddStory = () => {
    router.push('/notes/add');
  };

  const handleEditStory = (story: Story) => {
    setSelectedStory(story);
    setEditedText(story.rawText);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStory) return;

    try {
      const response = await authenticatedFetch(`/api/story/${selectedStory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawText: editedText }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update story');
      }

      const storiesResponse = await authenticatedFetch('/api/stories');
      if (storiesResponse.ok) {
        const data = await storiesResponse.json();
        setStories(data);
      }

      setIsEditing(false);
      setSelectedStory(null);
    } catch (error) {
      console.error('Error updating story:', error);
      alert('Failed to update story. Please try again.');
    }
  };

  const handleDeleteAllStories = async () => {
    try {
      const response = await authenticatedFetch('/api/stories/delete-all', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete stories');
      }

      setStories([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting stories:', error);
      alert('Failed to delete stories. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-blue-100 text-blue-800 p-4 rounded-lg mb-6">
          <p className="text-sm">
            Your stories are always private. You can publish a short summary of your experience to share with others.
          </p>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/home')}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Story Notes</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowTimeline(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              View Timeline
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete All Stories
            </button>
            <button
              onClick={handleAddStory}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              Add New Story
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {stories.map((story, index) => (
            <div
              key={story.id}
              className="bg-white rounded-lg shadow-sm border p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm text-gray-500 flex items-center">
                    <Lock className="w-4 h-4 text-green-500 mr-1" />
                    Note {index + 1} - {new Date(story.createdAt.$date).toLocaleString()} <span className="text-black-800 text-sm"> ( Private )</span>
                  </span>
                  <h2 className="text-xl font-semibold text-gray-900 mt-1">
                    {story.title ? story.title : `Story ${index + 1}`}
                  </h2>
                </div>
                <button
                  onClick={() => handleEditStory(story)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{story.rawText}</p>
            </div>
          ))}

          {stories.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">No stories yet. Click &quot;Add New Story&quot; to get started.</p>
            </div>
          )}
        </div>
      </div>

      {isEditing && selectedStory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold mb-4">Edit Story</h3>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-64 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <TimelineModal
        isOpen={showTimeline}
        onClose={() => setShowTimeline(false)}
      />

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Delete All Stories?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all your stories? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllStories}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryNotes; 