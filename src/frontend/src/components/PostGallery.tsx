import type { NftPost } from '../backend';
import PostCard from './PostCard';

interface PostGalleryProps {
  posts: Array<[bigint, NftPost]>;
  isAdmin: boolean;
}

export default function PostGallery({ posts, isAdmin }: PostGalleryProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <img
          src="/assets/generated/nft-gallery-placeholder.dim_400x300.png"
          alt="Empty gallery"
          className="w-64 h-48 object-contain mb-6 opacity-50"
        />
        <h3 className="text-2xl font-semibold mb-2">No NFTs Yet</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Be the first to share your favorite NFT collection with the community!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map(([postId, post]) => (
        <PostCard key={postId.toString()} post={post} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
