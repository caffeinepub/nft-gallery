import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, LogIn } from 'lucide-react';
import { useAddComment, useGetCallerUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CommentThread from './CommentThread';
import { toast } from 'sonner';

interface CommentsSectionProps {
  postId: bigint;
  commentIds: bigint[];
  isAdmin: boolean;
}

export default function CommentsSection({ postId, commentIds, isAdmin }: CommentsSectionProps) {
  const [commentText, setCommentText] = useState('');
  const addComment = useAddComment();
  
  const { identity, login, loginStatus } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  
  const isAuthenticated = !!identity;
  const hasCompleteProfile = isAuthenticated && userProfile !== null;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to comment');
      return;
    }

    if (!hasCompleteProfile) {
      toast.error('Please complete your profile before commenting');
      return;
    }

    if (!commentText.trim()) return;

    try {
      await addComment.mutateAsync({
        postId,
        content: commentText.trim(),
        parentId: null,
      });
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleLoginClick = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const canComment = isAuthenticated && hasCompleteProfile;

  return (
    <div className="p-4 space-y-4 bg-muted/30">
      {/* Comment Form */}
      {!isAuthenticated ? (
        <Alert>
          <LogIn className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to comment.{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={handleLoginClick}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Logging in...' : 'Log in now'}
            </Button>
          </AlertDescription>
        </Alert>
      ) : !hasCompleteProfile && !profileLoading ? (
        <Alert>
          <AlertDescription>
            Please complete your profile setup before commenting.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={addComment.isPending || !canComment}
              required
            />
            <Button
              type="submit"
              size="icon"
              disabled={addComment.isPending || !commentText.trim() || !canComment}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {commentIds.map((commentId) => (
          <CommentThread
            key={commentId.toString()}
            commentId={commentId}
            postId={postId}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}
