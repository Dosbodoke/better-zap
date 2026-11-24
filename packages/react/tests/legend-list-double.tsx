import { useMemo } from "react";
import type { CSSProperties, ReactNode, UIEvent } from "react";

interface LegendListDoubleProps<T> {
  data: readonly T[];
  renderItem: (info: {
    item: T;
    index: number;
    data: readonly T[];
    extraData: unknown;
    type: string;
  }) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  getItemType?: (item: T, index: number) => string;
  extraData?: unknown;
  stickyHeaderIndices?: number[];
  onStartReached?: (info: { distanceFromStart: number }) => void;
  onStartReachedThreshold?: number;
  className?: string;
  style?: CSSProperties;
}

function Row<T>({
  item,
  index,
  data,
  extraData,
  getItemType,
  renderItem,
  isSticky,
}: Pick<LegendListDoubleProps<T>, "data" | "extraData" | "getItemType" | "renderItem"> & {
  item: T;
  index: number;
  isSticky: boolean;
}) {
  const rendered = useMemo(
    () =>
      renderItem({
        item,
        index,
        data,
        extraData,
        type: getItemType?.(item, index) ?? "",
      }),
    [item, index, data, extraData],
  );
  return <div data-sticky-header={isSticky || undefined}>{rendered}</div>;
}

export function LegendList<T>({
  data,
  renderItem,
  keyExtractor,
  getItemType,
  extraData,
  stickyHeaderIndices = [],
  onStartReached,
  onStartReachedThreshold = 0.5,
  className,
  style,
}: LegendListDoubleProps<T>) {
  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight } = event.currentTarget;
    if (scrollTop <= onStartReachedThreshold * clientHeight) {
      onStartReached?.({ distanceFromStart: scrollTop });
    }
  };

  return (
    <div
      data-testid="legend-list"
      className={className}
      style={style}
      onScroll={handleScroll}
    >
      {data.map((item, index) => (
        <Row
          key={keyExtractor(item, index)}
          item={item}
          index={index}
          data={data}
          extraData={extraData}
          getItemType={getItemType}
          renderItem={renderItem}
          isSticky={stickyHeaderIndices.includes(index)}
        />
      ))}
    </div>
  );
}
