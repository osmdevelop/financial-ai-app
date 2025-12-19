import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Target, Plus, X, Check } from "lucide-react";

const ONBOARDING_KEY = "onboarding_v1_complete";

interface OnboardingLiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAssets: () => void;
  focusAssetsCount: number;
}

export function useOnboardingState(focusAssetsCount: number) {
  const [isComplete, setIsComplete] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  });

  const shouldShowOnboarding = !isComplete && focusAssetsCount === 0;

  const markComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsComplete(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setIsComplete(false);
  };

  return {
    isComplete,
    shouldShowOnboarding,
    markComplete,
    resetOnboarding,
  };
}

export function OnboardingLiteModal({
  open,
  onOpenChange,
  onAddAssets,
  focusAssetsCount,
}: OnboardingLiteModalProps) {
  const { markComplete } = useOnboardingState(focusAssetsCount);

  const handleAddAssets = () => {
    onOpenChange(false);
    onAddAssets();
  };

  const handleNotNow = () => {
    onOpenChange(false);
  };

  const handleSkip = () => {
    markComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="onboarding-modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Set up your Trader Lens</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Personalize your market view in 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm">Add up to 5 focus assets you actually trade.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm">Daily Brief and Headlines will filter to what matters for those assets.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm">Check the Daily Brief once per day to stay oriented.</span>
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleAddAssets}
            className="w-full"
            data-testid="onboarding-add-assets"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Focus Assets
          </Button>
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNotNow}
              className="text-muted-foreground"
              data-testid="onboarding-close"
            >
              Not now
            </Button>
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:underline"
              data-testid="onboarding-skip"
            >
              Skip onboarding
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
