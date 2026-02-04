import { useState } from 'react';
import type { NftPost } from '../backend';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, User, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CommentsSection from './CommentsSection';
import DeletePostDialog from './DeletePostDialog';
import LinkifiedText from './LinkifiedText';
import { useGetUserProfile, useGetPostLikes, useHasUserLiked, useLikePost, useIsFollowingUser, useFollowUser, useUnfollowUser } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';

interface PostCardProps {
  post: NftPost;
  isAdmin: boolean;
}

export default function PostCard({ post, isAdmin }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const { data: authorProfile } = useGetUserProfile(post.author.toString());
  const { identity } = useInternetIdentity();
  
  const userPrincipal = identity ? identity.getPrincipal() : null;
  const { data: likeCount = BigInt(0) } = useGetPostLikes(post.id);
  const { data: hasLiked = false } = useHasUserLiked(post.id, userPrincipal);
  const { data: isFollowing = false } = useIsFollowingUser(post.author);
  
  const likeMutation = useLikePost();
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const timestamp = new Date(Number(post.timestamp) / 1000000);
  const displayName = authorProfile?.username || 'User';
  
  const isOwnPost = userPrincipal?.toString() === post.author.toString();

  const handleLike = async () => {
    if (!identity) {
      toast.error('Please log in to like posts');
      return;
    }

    try {
      await likeMutation.mutateAsync(post.id);
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  const handleFollowToggle = async () => {
    if (!identity) {
      toast.error('Please log in to follow users');
      return;
    }

    try {
      if (isFollowing) {
        await unfollowMutation.mutateAsync(post.author);
      } else {
        await followMutation.mutateAsync(post.author);
      }
    } catch (error) {
      // Error is already handled by the mutation
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="space-y-3">
        {/* Description Caption */}
        {post.metadata.description && (
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            <LinkifiedText text={post.metadata.description} />
          </p>
        )}

        {/* Author and Timestamp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{displayName}</span>
            </div>
            
            {/* Follow Button */}
            {!isOwnPost && identity && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className="h-7 px-3 text-xs transition-all duration-300 ease-in-out hover:scale-105"
              >
                {followMutation.isPending || unfollowMutation.isPending ? (
                  <span className="animate-pulse">...</span>
                ) : isFollowing ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </Button>
            )}
            
            <span>•</span>
            <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
          </div>
          {isAdmin && <DeletePostDialog postId={post.id} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        {/* Image Gallery */}
        <div className="w-full">
          {post.images.length === 1 ? (
            <div className="w-full">
              <img
                src={post.images[0].getDirectURL()}
                alt="NFT"
                className="w-full h-auto object-contain max-h-[600px]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {post.images.map((image, index) => (
                <div key={index} className="aspect-square overflow-hidden">
                  <img
                    src={image.getDirectURL()}
                    alt={`NFT ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Like and Comments Actions */}
        <div className="px-6 pb-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className="gap-2 transition-transform duration-200 hover:scale-105"
          >
            <Heart 
              className={`h-4 w-4 transition-all duration-300 ${hasLiked ? 'fill-red-500 text-red-500 scale-110' : ''}`}
            />
            {Number(likeCount)} {Number(likeCount) === 1 ? 'Like' : 'Likes'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-2 transition-transform duration-200 hover:scale-105"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <CommentsSection
            postId={post.id}
            commentIds={post.comments}
            isAdmin={isAdmin}
          />
        )}
      </CardContent>
    </Card>
  );
}
