import { Button } from "@/components/ui/button";

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterBar = ({ activeFilter, onFilterChange }: FilterBarProps) => {
  const filters = [
    { label: "Latest", value: "latest" },
    { label: "All TP Hit", value: "all_tp_hit" },
    { label: "Running", value: "running" },
  ];

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-0">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          onClick={() => onFilterChange(filter.value)}
          className={`text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4 ${activeFilter === filter.value ? "btn-glow" : ""}`}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

export default FilterBar;
