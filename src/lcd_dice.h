#pragma once
#include <Arduino.h>

// TFT-Pinbelegung (GC9A01A)
#ifndef LCD_TFT_CS
#define LCD_TFT_CS 5
#endif
#ifndef LCD_TFT_DC
#define LCD_TFT_DC 16
#endif
#ifndef LCD_TFT_RST
#define LCD_TFT_RST 17
#endif
#ifndef LCD_TFT_SCLK
#define LCD_TFT_SCLK 18
#endif
#ifndef LCD_TFT_MOSI
#define LCD_TFT_MOSI 23
#endif

// Initialisiert Display und legt Grundzustand fest
void lcdDiceInit();

// Spielt die Wuerfelanimation ab und zeigt den uebergebenen Wert 1..6 an
void lcdDiceRoll(int finalValue);

// true, solange eine Animation laeuft (verhindert Doppel-Trigger)
bool lcdDiceIsBusy();
