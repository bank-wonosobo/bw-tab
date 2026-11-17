import { BankIcon, User } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function HeaderClient() {
    return (
        <>
            <div className="flex h-4 w-full shrink-0">
                <div className="w-[44%] bg-red-400" />
                <div className="flex-1 bg-red-600" />
            </div>

            <header className="sticky top-0 z-20 shadow-lg bg-background bg-primary text-white">
                <div className="mx-auto flex h-[84px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <HugeiconsIcon
                                icon={BankIcon}
                                size={23}
                                strokeWidth={2}
                            />
                        </div>

                        <div className="space-y-0.5">
                            <h1 className="text-lg font-bold leading-tight tracking-tight">
                                Bank Wonosobo
                            </h1>

                            <p className="text-sm text-white">BW TAB</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <span className="hidden text-sm font-medium text-whte sm:block">
                            Kantor Pusat
                        </span>

                        <button
                            type="button"
                            aria-label="Profil pengguna"
                            className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                        >
                            <HugeiconsIcon
                                icon={User}
                                size={22}
                                strokeWidth={1.8}
                            />
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
}
