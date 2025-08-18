export const NewspaperLoading = ({ percentage }: { percentage: number }) => {
  return (
    <div className="my-20 space-y-6 text-center">
      <div className="flex justify-center mt-4 space-x-1">
        <div className="animate-bounce bg-gray-800 h-2 rounded-full w-2"></div>
        <div
          className="animate-bounce bg-gray-800 h-2 rounded-full w-2"
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className="animate-bounce bg-gray-800 h-2 rounded-full w-2"
          style={{ animationDelay: "0.2s" }}
        ></div>
      </div>

      <div className="space-y-2">
        <p className={"font-bold text-gray-600"}>Grabbing the paper...</p>
        <p className={"text-gray-500 text-xs"}>{percentage.toFixed(2)}%</p>
      </div>
    </div>
  );
};
