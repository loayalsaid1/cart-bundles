import { getTranslations } from "next-intl/server";

export default async function TestPage() {
    const t = await getTranslations("TestPage");

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold">{t("title")}</h1>
        </div>
    );
}
