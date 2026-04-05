import { CardLoadingState, ChartCard } from '../components/chart-card';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded-full bg-mist" />
        <div className="h-10 w-3/4 animate-pulse rounded-full bg-mist" />
        <div className="h-6 w-2/3 animate-pulse rounded-full bg-mist" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl bg-white/70 shadow-card" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Sessions per Day">
          <CardLoadingState title="Sessions per Day" />
        </ChartCard>
        <ChartCard title="Character Popularity">
          <CardLoadingState title="Character Popularity" />
        </ChartCard>
      </div>
    </div>
  );
}
