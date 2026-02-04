import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { NftPost, Comment, UserRole, UserProfile, PostMetadata, UserId } from '../backend';
import { ExternalBlob } from '../backend';
import { Principal } from '@icp-sdk/core/principal';
import { toast } from 'sonner';

export function useGetAllPosts() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[bigint, NftPost]>>({
    queryKey: ['posts'],
    queryFn: async () => {
      if (!actor) return [];
      const posts = await actor.getAllPosts();
      // Sort by timestamp descending (newest first)
      return posts.sort((a, b) => Number(b[1].timestamp - a[1].timestamp));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPost(postId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<NftPost | null>({
    queryKey: ['post', postId?.toString()],
    queryFn: async () => {
      if (!actor || postId === null) return null;
      return actor.getPost(postId);
    },
    enabled: !!actor && !isFetching && postId !== null,
  });
}

export function useGetComment(commentId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Comment | null>({
    queryKey: ['comment', commentId?.toString()],
    queryFn: async () => {
      if (!actor || commentId === null) return null;
      return actor.getComment(commentId);
    },
    enabled: !!actor && !isFetching && commentId !== null,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ metadata, images }: { metadata: PostMetadata; images: ExternalBlob[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createNftPost(metadata, images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      parentId,
    }: {
      postId: bigint;
      content: string;
      parentId: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addComment(postId, content, parentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comment'] });
      toast.success('Comment added!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });
}

export function useDeleteComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteComment(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comment'] });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ['userRole'],
    queryFn: async () => {
      if (!actor) return 'guest' as UserRole;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useGetUserProfile(principalString: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', principalString],
    queryFn: async () => {
      if (!actor || !principalString) return null;
      const principal = Principal.fromText(principalString);
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !isFetching && !!principalString,
  });
}

export function useGetPostLikes(postId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['postLikes', postId.toString()],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getPostLikes(postId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useHasUserLiked(postId: bigint, userPrincipal: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['hasUserLiked', postId.toString(), userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return false;
      return actor.hasUserLiked(postId, userPrincipal);
    },
    enabled: !!actor && !isFetching && !!userPrincipal,
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.likePost(postId);
    },
    onSuccess: (_, postId) => {
      // Invalidate like-related queries for this post
      queryClient.invalidateQueries({ queryKey: ['postLikes', postId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['hasUserLiked', postId.toString()] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update like: ${error.message}`);
    },
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUser: UserId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.followUser(targetUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
      toast.success('User followed!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to follow user: ${error.message}`);
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUser: UserId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unfollowUser(targetUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
      toast.success('User unfollowed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unfollow user: ${error.message}`);
    },
  });
}

export function useIsFollowingUser(targetUser: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isFollowing', targetUser?.toString()],
    queryFn: async () => {
      if (!actor || !targetUser) return false;
      return actor.isFollowingUser(targetUser);
    },
    enabled: !!actor && !isFetching && !!targetUser,
  });
}

export function useGetFollowing() {
  const { actor, isFetching } = useActor();

  return useQuery<UserId[]>({
    queryKey: ['following'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowing();
    },
    enabled: !!actor && !isFetching,
  });
}
