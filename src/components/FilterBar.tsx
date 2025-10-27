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
    <div className="flex flex-wrap gap-3 mb-6">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          onClick={() => onFilterChange(filter.value)}
          className={activeFilter === filter.value ? "btn-glow" : ""}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

export default FilterBar;
