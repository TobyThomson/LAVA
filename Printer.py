#import RPi.GPIO as GPIO

import pygame
import numpy
import cairo
import rsvg
from PIL import Image

from subprocess import Popen
from time import sleep
from lxml import etree

import math

import RPi.GPIO as GPIO

Black = (0, 0, 0)
White = (255, 255, 255)

class Printer:
	def __init__ (self, stepperDirectionPin, stepperStepPin, projectorResolution, aPPassword, resinCureTime, layerHeight, threadsPerInch):
		self.StepperDirectionPin = stepperDirectionPin
		self.StepperStepPin = stepperStepPin

		self.ProjectorResolution = projectorResolution

		self.APPassword = aPPassword

		self.ResinCureTime = resinCureTime

		self.ThreadsPerInch = threadsPerInch
		self.LayerHeight = layerHeight

		GPIO.setmode(GPIO.BCM)

		GPIO.setup(self.StepperDirectionPin, GPIO.OUT)
		GPIO.setup(self.StepperStepPin, GPIO.OUT)

		pygame.init()

		self.Screen = pygame.display.set_mode(self.ProjectorResolution, pygame.FULLSCREEN)

		self.Data = numpy.empty(self.ProjectorResolution[0] * self.ProjectorResolution[1] * 4, dtype=numpy.int8)

		self.CairoSurface = cairo.ImageSurface.create_for_data(self.Data, cairo.FORMAT_ARGB32, self.ProjectorResolution[0], self.ProjectorResolution[1], self.ProjectorResolution[0] * 4)
		self.CairoContext = cairo.Context(self.CairoSurface)

		pygame.mouse.set_visible(False);

		self.ProjectorHandler = Popen(['am7xxx-play', '-f', 'x11grab', '-i', ':0.0', '-o', 'video_size=800x480'])

		self.Layers = {}

	def __del__ (self):
		self.ProjectorHandler.terminate()

		pygame.quit()

	def DisplayAPPassword (self):
		passwordSurface = (pygame.Surface(self.Screen.get_size())).convert()

		font = pygame.font.Font(None, 36)
		text = font.render(("Password: " + self.APPassword), 1, White)

		textPosition = text.get_rect()

		textPosition.centerx = passwordSurface.get_rect().centerx
		textPosition.centery = passwordSurface.get_rect().centery

		passwordSurface.blit(text, textPosition)

		self.Screen.fill(Black)

		self.Screen.blit(passwordSurface, (0, 0))

		pygame.display.flip()

	def MoveBed (self, distance):
		if distance > 0:
		    GPIO.output(self.StepperDirectionPin, False)

		elif distance < 0:
		    GPIO.output(self.StepperDirectionPin, True)

		for i in range(0, int((200 * (self.ThreadsPerInch / 25.4)) * self.LayerHeight)):
		    GPIO.output(self.StepperStepPin, True)
		    sleep(0.01)
		    GPIO.output(self.StepperStepPin, False)
		    sleep(0.01)

	def SetPrintFile (self, printFile):
		self.PrintFile = printFile

		self.Screen.fill(Black)

		pygame.display.flip()

		tree = etree.parse(printFile)

		for el in tree.iter():
			if str(el.tag).split("}")[1] == 'g':
				name = el.get("id")

				self.Layers[name] = []

			elif el.tag.split("}")[1] == 'polygon':
				self.Layers[name].append(etree.tostring(el, with_tail = False))

	def GetEstimatedPrintSeconds (self):
		threadsPerMillimeter = self.ThreadsPerInch / 25.4
		stepsPerLayer = (200 * threadsPerMillimeter) * self.LayerHeight
		layerTime = (stepsPerLayer * (0.01 * 2))
		repositionTime = (5 * layerTime) + (4 * layerTime)
		totalTime = (layerTime + repositionTime) * len(self.Layers)

		return totalTime

	def Print (self, sendMessage, printFinishedCommand, resetDate):
		self.Screen.fill(Black)

		for i in range(0, len(self.Layers)):
			layerSVG = ('<svg> %s </svg>' % self.Layers['layer' + str(i)])

			svgGraphics = rsvg.Handle(None, layerSVG)

			svgGraphics.render_cairo(self.CairoContext)

			dataString = (Image.frombuffer('RGBA', (self.CairoSurface.get_width(), self.CairoSurface.get_height()), self.CairoSurface.get_data(), 'raw', 'BGRA', 0, 1)).tobytes('raw', 'RGBA', 0, 1)
			layerSurface = pygame.image.frombuffer(dataString, self.ProjectorResolution, 'RGBA')

			self.Screen.blit(layerSurface, ((self.ProjectorResolution[0] / 2), (self.ProjectorResolution[1] / 2)))

			pygame.display.flip()

			sleep(self.ResinCureTime)

			self.Screen.fill(Black)

			pygame.display.flip()

			self.MoveBed(5 * self.LayerHeight)
			self.MoveBed(-1 * (4 * self.LayerHeight))

		sendMessage(printFinishedCommand)

		resetDate()
