import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Helper: map labels to categories
function mapLabelsToCategory(labels: string[]): { category: 'Recyclable' | 'Organic' | 'General Waste'; tips: string[] } {
  const ll = labels.map(l => l.toLowerCase());
  const anyIncludes = (keys: string[]) => ll.some(l => keys.some(k => l.includes(k)));

  const recyclableKeys = [
    'bottle','water bottle','glass bottle','wine bottle','beer bottle','can','aluminum','aluminium','tin','jar','glass','cup','mug','plate','bowl',
    'paper','newspaper','magazine','cardboard','carton','box','packaging','packet','envelope','book',
    'metal','steel','iron','copper','wire','cable','screw','bolt'
  ];
  const organicKeys = [
    'banana','apple','orange','fruit','vegetable','broccoli','carrot','cabbage','lettuce','corn','pumpkin','mushroom','potato','tomato','eggplant','citrus','grape','strawberry','pineapple','mango','papaya','onion','garlic','ginger','lime','lemon','melon','avocado','chili',
    'bread','sandwich','salad','pizza','burger','noodle','pasta','rice','egg','omelet','omelette','cake','cookie'
  ];

  if (anyIncludes(organicKeys)) {
    return { category: 'Organic', tips: ['Remove stickers or plastic ties','Compost if available','Keep liquids minimal'] };
  }
  if (anyIncludes(recyclableKeys)) {
    return { category: 'Recyclable', tips: ['Rinse to remove residue','Flatten cardboard if possible','Place in appropriate bin'] };
  }
  return { category: 'General Waste', tips: ['If unsure, dispose in general waste','Avoid contaminating recyclables','Check local guidelines'] };
}

// POST /api/ai/classify
// Body: { imageBase64: string (base64 without prefix), mime?: string, modelId?: string }
router.post('/classify', async (req, res) => {
  try {
    const { imageBase64, mime = 'image/png', modelId } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    const HF_API_TOKEN = process.env.HF_API_TOKEN;
    if (!HF_API_TOKEN) {
      return res.status(503).json({ error: 'HF_API_TOKEN not configured on server' });
    }
    const MODEL = modelId || process.env.HF_MODEL_ID || 'google/vit-base-patch16-224';

    const bytes = Buffer.from(imageBase64, 'base64');
    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_TOKEN}`,
        'Content-Type': mime
      },
      body: bytes
    });

    if (!hfRes.ok) {
      const txt = await hfRes.text();
      return res.status(502).json({ error: 'HF inference failed', details: txt.slice(0, 500) });
    }

    const data = await hfRes.json();
    // data is array of { label, score }
    const preds = Array.isArray(data) ? data : [];
    const labels: string[] = preds.slice(0, 5).map((p: any) => p.label || '');
    const confidence = preds[0]?.score || 0;
    const { category, tips } = mapLabelsToCategory(labels);

    res.json({
      label: preds[0]?.label || 'unknown',
      confidence,
      category,
      tips,
      raw: preds
    });
  } catch (err) {
    console.error('AI classify error:', err);
    res.status(500).json({ error: 'Failed to classify via AI' });
  }
});

export default router;
