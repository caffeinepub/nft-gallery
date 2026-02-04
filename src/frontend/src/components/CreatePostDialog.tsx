import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Upload, Loader2, X, LogIn } from 'lucide-react';
import { useCreatePost, useGetCallerUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImagePreview {
  file: File;
  preview: string;
}

export default function CreatePostDialog() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { identity, login, loginStatus } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const createPost = useCreatePost();

  const isAuthenticated = !!identity;
  const hasCompleteProfile = isAuthenticated && userProfile !== null;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (imagePreviews.length + files.length > 4) {
      toast.error('Maximum 4 images allowed per post');
      return;
    }

    const newPreviews: ImagePreview[] = [];
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push({
          file,
          preview: reader.result as string,
        });
        
        if (newPreviews.length === files.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to create a post');
      return;
    }

    if (!hasCompleteProfile) {
      toast.error('Please complete your profile before posting');
      return;
    }

    if (!description.trim()) {
      toast.error('Post caption is required');
      return;
    }

    if (imagePreviews.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    try {
      const blobs: ExternalBlob[] = [];
      
      for (const { file } of imagePreviews) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
        blobs.push(blob);
      }

      await createPost.mutateAsync({
        metadata: {
          description: description.trim(),
          author: identity?.getPrincipal(),
        },
        images: blobs,
      });

      // Reset form
      setOpen(false);
      setDescription('');
      setImagePreviews([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isAuthenticated) {
      toast.error('Please log in to create a post');
      return;
    }
    if (newOpen && !hasCompleteProfile && !profileLoading) {
      toast.error('Please complete your profile before posting');
      return;
    }
    setOpen(newOpen);
  };

  const handleLoginClick = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const isSubmitting = createPost.isPending;
  const canAddMore = imagePreviews.length < 4;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Share NFT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share an NFT</DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <Alert>
            <LogIn className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to create a post.{' '}
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
              Please complete your profile setup before creating a post.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Make a Post *</Label>
              <Textarea
                id="description"
                placeholder="Make a Post..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">Caption is required</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">NFT Images * (up to 4)</Label>
              <div className="flex flex-col gap-3">
                {canAddMore && (
                  <input
                    id="images"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    multiple
                  />
                )}
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group">
                        <img
                          src={preview.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {!isSubmitting && (
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {imagePreviews.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {imagePreviews.length} of 4 images selected
                  </p>
                )}
              </div>
            </div>

            {isSubmitting && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || imagePreviews.length === 0 || !description.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Share
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
