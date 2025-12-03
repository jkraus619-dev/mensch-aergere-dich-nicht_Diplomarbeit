#include "lcd_dice.h"
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>

static volatile bool lcdBusy = false;

// Anzeigenparameter
static constexpr int DICE_SIZE = 160;
static constexpr int DICE_CORNER_RADIUS = 24;
static constexpr int DICE_DOT_RADIUS = 14;
static constexpr uint16_t COLOR_DICE = GC9A01A_WHITE;
static constexpr uint16_t COLOR_DICE_BORDER = GC9A01A_WHITE;
static constexpr uint16_t COLOR_DICE_DOT = GC9A01A_BLACK;

static constexpr int DICE_STEPS = 20;
static constexpr int FAST_DELAY_MS = 60;
static constexpr int MEDIUM_DELAY_MS = 200;
static constexpr int SLOW_DELAY_1_MS = 400;
static constexpr int SLOW_DELAY_2_MS = 650;
static constexpr int SLOW_DELAY_3_MS = 950;

static Adafruit_GC9A01A tft(LCD_TFT_CS, LCD_TFT_DC, LCD_TFT_RST);
static bool lcdReady = false;
static int gridCenterX = 0;
static int gridCenterY = 0;
static int gridStep = 0;
static uint16_t currentBgColor = GC9A01A_BLACK;
static const uint16_t BG_COLORS[] = {
  GC9A01A_BLUE,
  GC9A01A_GREEN,
  GC9A01A_YELLOW,
  GC9A01A_RED,
  GC9A01A_BLACK
};
static size_t bgIndex = 0;

static void drawDiceBackground() {
  int originX = (tft.width() - DICE_SIZE) / 2;
  int originY = (tft.height() - DICE_SIZE) / 2;
  gridCenterX = originX + DICE_SIZE / 2;
  gridCenterY = originY + DICE_SIZE / 2;
  gridStep = DICE_SIZE / 4;

  tft.fillRoundRect(originX, originY, DICE_SIZE, DICE_SIZE, DICE_CORNER_RADIUS, COLOR_DICE);
  tft.drawRoundRect(originX, originY, DICE_SIZE, DICE_SIZE, DICE_CORNER_RADIUS, COLOR_DICE_BORDER);
}

static void drawDot(int dx, int dy) {
  int x = gridCenterX + dx * gridStep;
  int y = gridCenterY + dy * gridStep;
  tft.fillCircle(x, y, DICE_DOT_RADIUS, COLOR_DICE_DOT);
}

static void drawDiceFace(int face) {
  drawDiceBackground();

  switch (face) {
    case 1:
      drawDot(0, 0);
      break;
    case 2:
      drawDot(-1, -1); drawDot(1, 1);
      break;
    case 3:
      drawDot(-1, -1); drawDot(0, 0); drawDot(1, 1);
      break;
    case 4:
      drawDot(-1, -1); drawDot(1, -1); drawDot(-1, 1); drawDot(1, 1);
      break;
    case 5:
      drawDot(-1, -1); drawDot(1, -1); drawDot(0, 0); drawDot(-1, 1); drawDot(1, 1);
      break;
    case 6:
    default:
      drawDot(-1, -1); drawDot(1, -1);
      drawDot(-1, 0);  drawDot(1, 0);
      drawDot(-1, 1);  drawDot(1, 1);
      break;
  }
}

void lcdDiceInit() {
  SPI.begin(LCD_TFT_SCLK, -1, LCD_TFT_MOSI);
  tft.begin(40000000);
  tft.setRotation(0);
  tft.fillScreen(GC9A01A_BLACK);
  tft.setTextColor(GC9A01A_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, tft.height() / 2 - 10);
  tft.print("LCD bereit");
  lcdReady = true;
}

void lcdDiceRoll(int finalValue) {
  if (lcdBusy) return;      // blockiert parallele Aufrufe
  lcdBusy = true;

  if (!lcdReady) {
    lcdDiceInit();
  }
  if (finalValue < 1 || finalValue > 6) {
    finalValue = (abs(finalValue) % 6) + 1;
  }

  currentBgColor = BG_COLORS[bgIndex++ % (sizeof(BG_COLORS) / sizeof(BG_COLORS[0]))];
  tft.fillScreen(currentBgColor);

  for (int i = 0; i < DICE_STEPS; i++) {
    int value = random(1, 7);
    drawDiceFace(value);
    delay(1); // kurz yield fuer WDT

    if (i < DICE_STEPS - 3) {
      int stepDelay = map(i, 0, DICE_STEPS - 4, FAST_DELAY_MS, MEDIUM_DELAY_MS);
      delay(stepDelay);
    } else if (i == DICE_STEPS - 3) {
      delay(SLOW_DELAY_1_MS);
    } else if (i == DICE_STEPS - 2) {
      delay(SLOW_DELAY_2_MS);
    } else {
      delay(SLOW_DELAY_3_MS);
    }
  }

  drawDiceFace(finalValue);
  lcdBusy = false;
}

bool lcdDiceIsBusy() {
  return lcdBusy;
}
