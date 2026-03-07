'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'messages'));
      const messagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText) return;
    
    try {
      await updateDoc(doc(db, 'messages', selectedMessage.id), {
        status: 'Replied',
        reply: replyText
      });
      
      toast.success(`Reply sent to ${selectedMessage.customerName}`);
      setSelectedMessage(null);
      setReplyText('');
      fetchMessages();
    } catch (error) {
      toast.error('Error sending reply');
    }
  };

  const handleMarkReplied = async (message: Message) => {
    try {
      await updateDoc(doc(db, 'messages', message.id), {
        status: 'Replied'
      });
      toast.success('Message marked as replied');
      fetchMessages();
    } catch (error) {
      toast.error('Error updating message');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Customer Messages</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {messages.map((message) => (
                <tr 
                  key={message.id} 
                  onClick={() => handleSelectMessage(message)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-gray-900">{message.customerName}</td>
                  <td className="px-6 py-4 italic text-gray-600">"{message.message}"</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      message.status === 'Unreplied' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {message.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Reply Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {selectedMessage ? (
            <>
              <h2 className="text-xl font-bold mb-4 text-gray-900">Reply to {selectedMessage.customerName}</h2>
              
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm font-bold text-gray-900">Original Message:</p>
                <p className="italic text-gray-500">"{selectedMessage.message}"</p>
              </div>
              
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full p-3 border rounded mb-4 text-gray-900"
                rows={4}
                placeholder="Type your reply here..."
              />
  
              <div className="flex gap-2">
                <button
                  onClick={handleReply}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Send Reply
                </button>
                <button
                  onClick={() => handleMarkReplied(selectedMessage)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                >
                  Mark as Replied
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Select a message to reply
            </div>
          )}
        </div>
      </div>
    </div>
  );
}