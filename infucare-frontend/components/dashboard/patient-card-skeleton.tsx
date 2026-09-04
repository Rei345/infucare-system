"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function PatientCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Banner Skeleton */}
      <div className="h-10 w-full skeleton bg-muted" />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar Skeleton */}
            <div className="h-12 w-12 rounded-full skeleton bg-muted" />
            
            <div className="space-y-2">
              <div className="h-4 w-24 skeleton rounded bg-muted" />
              <div className="h-3 w-32 skeleton rounded bg-muted" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 skeleton rounded bg-muted" />
            <div className="h-3 w-8 skeleton rounded bg-muted" />
          </div>
          <div className="h-3 w-full skeleton rounded-full bg-muted" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="h-3 w-16 skeleton rounded mb-2 bg-muted" />
            <div className="h-6 w-12 skeleton rounded bg-muted" />
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="h-3 w-20 skeleton rounded mb-2 bg-muted" />
            <div className="h-6 w-16 skeleton rounded bg-muted" />
          </div>
        </div>

        {/* TPM Controls Skeleton */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="h-4 w-24 skeleton rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-full skeleton rounded bg-muted" />
            <div className="h-8 w-full skeleton rounded bg-muted" />
            <div className="h-8 w-full skeleton rounded bg-muted" />
          </div>
          <div className="h-2 w-full skeleton rounded-full bg-muted mt-2" />
        </div>

        {/* Buttons Skeleton */}
        <div className="grid grid-cols-2 gap-2">
          <div className="h-9 w-full skeleton rounded bg-muted" />
          <div className="h-9 w-full skeleton rounded bg-muted" />
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between mt-2">
          <div className="h-3 w-32 skeleton rounded bg-muted" />
          <div className="h-3 w-20 skeleton rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}