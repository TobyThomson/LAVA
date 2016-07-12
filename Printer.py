import math
import pygame
import cairo
import numpy
import Image
import rsvg
import datetime
import threading
import os

import RPi.GPIO as GPIO

from subprocess import Popen
from lxml import etree
from time import sleep

MotorDirectionPin = 4
MotorStepPin = 17

OKLedPin = 47

GPIO.setmode(GPIO.BCM)

GPIO.setwarnings(False)

GPIO.setup(MotorDirectionPin, GPIO.OUT)
GPIO.setup(MotorStepPin, GPIO.OUT)

GPIO.setup(OKLedPin, GPIO.OUT)

GPIO.output(OKLedPin, GPIO.HIGH)

class Printer:
	def __init__(self, resinCureTime, bedRepositionWaitTime, refillLayerStep, layerHeight, threadsPerInch):
		self.ResinCureTime = resinCureTime
		self.BedRepositionWaitTime = bedRepositionWaitTime
			
		self.RefillLayerStep = refillLayerStep
		
		self.ThreadsPerInch = threadsPerInch
		self.LayerHeight = layerHeight
		
		self.Layers = {}
		
		self.Paused = False
		
		self.PauseHandler = threading.Event()
		
		drivers = ['fbcon', 'directfb', 'svgalib']
		
		found = False
		
		for driver in drivers:
			if not os.getenv('SDL_VIDEODRIVER'):
				os.putenv('SDL_VIDEODRIVER', driver)
			
			try:
				pygame.display.init()
			
			except pygame.error:
				continue
			
			found = True
			
			break
		
		if not found:
			raise Exception('No suitable video driver found!')
		
		self.Width = pygame.display.Info().current_w
		self.Height = pygame.display.Info().current_h
		
		self.Screen = pygame.display.set_mode((self.Width, self.Height), pygame.FULLSCREEN)
		self.Data = numpy.empty(self.Width * self.Height * 4, dtype=numpy.int8)
		self.Cairo_surface = cairo.ImageSurface.create_for_data(self.Data, cairo.FORMAT_ARGB32, self.Width, self.Height, self.Width * 4)
		self.Ctx = cairo.Context(self.Cairo_surface)
		
		self.ProjectorHandler = Popen(['am7xxx-play', '-f', 'x11grab', '-i', ':0.0', '-o', 'video_size=800x480'])
		
		sleep(3)
	
	def MoveBed (self, distance):
		if distance > 0:
		    GPIO.output(MotorDirectionPin, False)
		    
		elif distance < 0:
		    GPIO.output(MotorDirectionPin, True)
			
		for i in range(0, int(((360 * (self.ThreadsPerInch / 25.4)) / 200) * math.fabs(distance))):
		    GPIO.output(MotorStepPin, True)
		    sleep(0.01)
		    GPIO.output(MotorStepPin, False)
		    sleep(0.01)
	
	def SetPrintFile (self, printFile):
		self.PrintFile = printFile
		
		tree = etree.parse(printFile)
		
		for el in tree.iter():
			if str(el.tag).split("}")[1] == 'g':
				name = el.get("id")
				
				self.Layers[name] = []
				
			elif el.tag.split("}")[1] == 'polygon':
				self.Layers[name].append(etree.tostring(el, with_tail = False))
	
	def GetFinishedPrintTime (self):
		layerTime = (float(((360 * (self.ThreadsPerInch / 25.4)) / 200) * self.LayerHeight)) + self.BedRepositionWaitTime + self.ResinCureTime
		printTime = layerTime * len(self.Layers)
		
		now = datetime.datetime.now()
		
		return ((now + datetime.timedelta(seconds = printTime)).strftime("%m/%d/%Y %H:%M:%S"))
				
	def Print (self):
		pygame.init()
		
		for layerNum in range(0, len(self.Layers)):
			if (layerNum > 0) and ((layerNum % self.RefillLayerStep) == 0):			
				sendMessage('refill')
			
			svg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
			<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
			
			<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:slic3r="http://slic3r.org/namespaces/slic3r">
			''' + '\n \t'.join(self.Layers['layer' + str(layerNum)]) + '''
			</svg>
			'''
			
			svg_graphics = rsvg.Handle(None, svg)
			
			svg_graphics.render_cairo(self.Ctx)
			
			data_string = (Image.frombuffer('RGBA', (self.Cairo_surface.get_width(), self.Cairo_surface.get_height()), self.Cairo_surface.get_data(), 'raw', 'BGRA', 0, 1)).tostring('raw', 'RGBA', 0, 1)
			pygame_surface = pygame.image.frombuffer(data_string, (self.Width, self.Height), 'RGBA')
			
			self.Screen.blit(pygame_surface, ((self.Width / 2), (self.Height / 2))) 
			pygame.display.flip()
			
			sleep(self.ResinCureTime)
			
			self.MoveBed(self.LayerHeight)
			
			sleep(self.BedRepositionWaitTime)
		
		pygame.quit()
		
		self.ProjectorHandler.terminate
