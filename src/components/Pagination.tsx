import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
}

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generar números de página visibles
    const getVisiblePages = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-[#404040]">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Mostrando {startItem}-{endItem} de {totalItems}
            </p>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-[#404040] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#262626] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="hidden sm:flex items-center gap-1">
                    {getVisiblePages().map((page, index) => (
                        typeof page === 'number' ? (
                            <button
                                key={index}
                                onClick={() => onPageChange(page)}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${currentPage === page
                                        ? 'bg-slate-900 text-white dark:bg-slate-700'
                                        : 'border border-slate-200 dark:border-[#404040] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#262626]'
                                    }`}
                            >
                                {page}
                            </button>
                        ) : (
                            <span key={index} className="px-2 text-slate-400">...</span>
                        )
                    ))}
                </div>

                <span className="sm:hidden text-sm text-slate-600 dark:text-slate-400 px-3">
                    {currentPage} / {totalPages}
                </span>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-[#404040] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#262626] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
