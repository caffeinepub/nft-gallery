import { useState } from 'react';
import { useGetComment, useAddComment, useGetCallerUserProfile, useGetUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reply, User, Send, LogIn } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DeleteCommentDialog from './DeleteCommentDialog';
import { toast } from 'sonner';

interface CommentThreadProps {
  commentId: bigint;
  postId: bigint;
  isAdmin: boolean;
  depth?: number;
}

export default function CommentThread({ commentId, postId, isAdmin, depth = 0 }: CommentThreadProps) {
  const { data: comment } = useGetComment(commentId);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const addComment = useAddComment();
  
  const { identity, login, loginStatus } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const { data: commentAuthorProfile } = useGetUserProfile(comment?.author.toString() || null);
  
  const isAuthenticated = !!identity;
  const hasCompleteProfile = isAuthenticated && userProfile !== null;
  const isLoggingIn = loginStatus === 'logging-in';

  if (!comment) return null;

  const timestamp = new Date(Number(comment.timestamp) / 1000000);
  const maxDepth = 3;
  const canReply = isAuthenticated && hasCompleteProfile;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to reply');
      return;
    }

    if (!hasCompleteProfile) {
      toast.error('Please complete your profile before replying');
      return;
    }

    if (!replyText.trim()) return;

    try {
      await addComment.mutateAsync({
        postId,
        content: replyText.trim(),
        parentId: commentId,
      });
      setReplyText('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleLoginClick = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const displayName = commentAuthorProfile?.username || 'User';

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-border pl-3' : ''}>
      <div className="bg-background rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="font-medium">{displayName}</span>
            <span>•</span>
            <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
          </div>
          {isAdmin && <DeleteCommentDialog commentId={commentId} />}
        </div>
        <p className="text-sm">{comment.content}</p>
        {depth < maxDepth && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="h-7 text-xs gap-1"
          >
            <Reply className="h-3 w-3" />
            Reply
          </Button>
        )}

        {showReplyForm && (
          <div className="space-y-2 pt-2">
            {!isAuthenticated ? (
              <Alert>
                <LogIn className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You must be logged in to reply.{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold text-xs"
                    onClick={handleLoginClick}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? 'Logging in...' : 'Log in now'}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : !hasCompleteProfile && !profileLoading ? (
              <Alert>
                <AlertDescription className="text-xs">
                  Please complete your profile setup before replying.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleReply} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={addComment.isPending || !canReply}
                    required
                    className="h-8 text-sm"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={addComment.isPending || !replyText.trim() || !canReply}
                    className="h-8 w-8"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((replyId) => (
            <CommentThread
              key={replyId.toString()}
              commentId={replyId}
              postId={postId}
              isAdmin={isAdmin}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
