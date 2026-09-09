import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SpeechBubble } from "@/components/ui/speech-bubble";
import { ComponentShowcase } from "../_components/component-showcase";
import { PreviewSection } from "../_components/preview-section";

export default function UIPreviewPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-foreground mb-8">UI Primitives</h1>

      <ComponentShowcase title="Button" description="@/components/ui/button">
        <PreviewSection label="Variants">
          <div className="flex flex-wrap gap-3">
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </PreviewSection>
        <PreviewSection label="Sizes">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">I</Button>
          </div>
        </PreviewSection>
        <PreviewSection label="Disabled">
          <div className="flex flex-wrap gap-3">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled Outline
            </Button>
          </div>
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase title="Badge" description="@/components/ui/badge">
        <PreviewSection label="Variants">
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="muted">Muted</Badge>
            <Badge variant="dark">Dark</Badge>
            <Badge variant="light">Light</Badge>
          </div>
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase title="Card" description="@/components/ui/card">
        <PreviewSection label="Basic">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>カードタイトル</CardTitle>
              <CardDescription>カードの説明文</CardDescription>
            </CardHeader>
            <CardContent>
              <p>カードのコンテンツがここに入ります。</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">アクション</Button>
            </CardFooter>
          </Card>
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase
        title="SpeechBubble"
        description="@/components/ui/speech-bubble"
      >
        <PreviewSection label="Tail Positions">
          <div className="flex flex-wrap gap-8 items-start">
            <SpeechBubble tailPosition="bottom" className="max-w-xs">
              Bottom tail (default)
            </SpeechBubble>
            <SpeechBubble tailPosition="top" className="max-w-xs">
              Top tail
            </SpeechBubble>
            <SpeechBubble tailPosition="left" className="max-w-xs">
              Left tail
            </SpeechBubble>
            <SpeechBubble tailPosition="right" className="max-w-xs">
              Right tail
            </SpeechBubble>
          </div>
        </PreviewSection>
        <PreviewSection label="Tail Alignment">
          <div className="flex flex-wrap gap-8 items-start">
            <SpeechBubble tailPosition="bottom" tailAlign="start">
              Start
            </SpeechBubble>
            <SpeechBubble tailPosition="bottom" tailAlign="center">
              Center
            </SpeechBubble>
            <SpeechBubble tailPosition="bottom" tailAlign="end">
              End
            </SpeechBubble>
          </div>
        </PreviewSection>
      </ComponentShowcase>
      <ComponentShowcase
        title="Color Tokens"
        description="@mirai-gikai/branding（案3-1パレット）"
      >
        <PreviewSection label="面トークン（文字は base-ink。白文字は禁止）">
          <div className="flex flex-wrap gap-3">
            {[
              ["bg-sky-400", "sky/400 プライマリ面"],
              ["bg-sky-500", "sky/500 ホバー"],
              ["bg-green-400", "green/400 進捗・バッジ"],
              ["bg-yellow-400", "yellow/400 アクセント"],
              ["bg-lavender-300", "lavender/300 AI関連"],
              ["bg-secondary", "secondary (sky/50)"],
              ["bg-muted", "muted (base-surface)"],
            ].map(([cls, label]) => (
              <span
                key={cls}
                className={`${cls} text-foreground rounded-lg px-4 py-2 text-sm font-bold`}
              >
                {label}
              </span>
            ))}
          </div>
        </PreviewSection>
        <PreviewSection label="文字トークン（対白 4.5:1 以上）">
          <div className="flex flex-wrap gap-4 text-sm font-bold">
            <span className="text-foreground">foreground (base-ink)</span>
            <span className="text-muted-foreground">muted-foreground</span>
            <span className="text-primary-accent">
              primary-accent (sky/700)
            </span>
            <span className="text-green-700">green/700 成功</span>
            <span className="text-system-warning">
              system-warning（本文サイズ不可）
            </span>
            <span className="text-destructive">
              destructive（破壊的操作のみ）
            </span>
          </div>
        </PreviewSection>
        <PreviewSection label="グラデーション（ヒーロー・完了画面のみ）">
          <div className="bg-hero-gradient text-foreground rounded-lg px-6 py-4 text-sm font-bold">
            bg-hero-gradient（sky/50 → sky/200）
          </div>
        </PreviewSection>
      </ComponentShowcase>
    </>
  );
}
