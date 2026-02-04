import { useEffect, useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetAllPosts, useGetCallerUserRole, useGetCallerUserProfile, useGetFollowing } from './hooks/useQueries';
import Header from './components/Header';
import Footer from './components/Footer';
import PostGallery from './components/PostGallery';
import CreatePostDialog from './components/CreatePostDialog';
import AdminPanel from './components/AdminPanel';
import ProfileSetupDialog from './components/ProfileSetupDialog';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function App() {
  const { identity } = useInternetIdentity();
  const { data: posts, isLoading: postsLoading } = useGetAllPosts();
  const { data: userRole } = useGetCallerUserRole();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { data: following = [] } = useGetFollowing();
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const isAdmin = userRole === 'admin';
  const isAuthenticated = !!identity;

  useEffect(() => {
    if (isAuthenticated && !profileLoading && isFetched && userProfile === null) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  // Filter posts from followed users
  const followingPosts = posts?.filter(([_, post]) => 
    following.some(followedUser => followedUser.toString() === post.author.toString())
  ) || [];

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent">
                NFT Gallery
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-6">
                A platform to Create and Post NFT and NFT Related Contents
              </p>
              <CreatePostDialog />
            </div>

            {/* Admin Panel */}
            {isAuthenticated && isAdmin && (
              <div className="mb-8">
                <AdminPanel />
              </div>
            )}

            {/* Posts Gallery with Tabs */}
            {postsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                  <TabsTrigger value="all">All Posts</TabsTrigger>
                  <TabsTrigger value="following" disabled={!isAuthenticated}>
                    Following
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">
                  <PostGallery posts={posts || []} isAdmin={isAdmin} />
                </TabsContent>
                
                <TabsContent value="following">
                  {!isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <p className="text-muted-foreground text-center max-w-md">
                        Please log in to view posts from users you follow.
                      </p>
                    </div>
                  ) : followingPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <img
                        src="/assets/generated/nft-gallery-placeholder.dim_400x300.png"
                        alt="No following posts"
                        className="w-64 h-48 object-contain mb-6 opacity-50"
                      />
                      <h3 className="text-2xl font-semibold mb-2">No Posts Yet</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        {following.length === 0 
                          ? "Follow other users to see their posts here!"
                          : "Users you follow haven't posted yet. Check back later!"}
                      </p>
                    </div>
                  ) : (
                    <PostGallery posts={followingPosts} isAdmin={isAdmin} />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>

        <Footer />
        <Toaster />
        
        {/* Profile Setup Dialog */}
        <ProfileSetupDialog open={showProfileSetup} onOpenChange={setShowProfileSetup} />
      </div>
    </ThemeProvider>
  );
}
