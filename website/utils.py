import os
import re
import sys
import uuid

import pika
import ipdb

from website.models import Annotation
from website.choices import region_choic
from audio_titles import *
import datetime as dt

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(BASE_DIR,"static","audios")
audio_re = re.compile(r"(?P<id_title>[0-9]+)-(?P<id_seq>[0-9]+)\.[a-zA-Z0-9]+")

class AudioFileRPCClient(object):
    def __init__(self):
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
        self.channel = self.connection.channel()
        result = self.channel.queue_declare(exclusive=True)
        self.callback_queue = result.method.queue
        self.channel.basic_consume(self.on_response, no_ack=True, queue=self.callback_queue)

    def on_response(self, ch, method, props, body):
        if self.corr_id == props.correlation_id:
            self.response = body

    def call(self, user):
        self.response = None
        self.corr_id = str(uuid.uuid4())
        self.channel.basic_publish(exchange='',
                                   routing_key='rpc_queue',
                                   properties=pika.BasicProperties(
                                           reply_to = self.callback_queue,
                                           correlation_id = self.corr_id),
                                   body=user)
        while self.response is None:
            self.connection.process_data_events()
        return self.response.decode("utf-8")

def get_audio_filename(user):
    rpc_client = AudioFileRPCClient()
    return rpc_client.call(user.encode("utf-8"))


def get_audio_title(audio_fn):
	# get title from .json or somth
	try:
		subdir,fn = audio_fn.split("/")
		match = audio_re.search(fn)
		idx = int(match.group("id_title"))
		return audio_titles[idx-1] + " - " + match.group("id_seq")
	except:
		ipdb.set_trace()
		print("Error while getting audio title")
		return ""


def update_user(user,start,end,not_count):
	user.last_submit = dt.datetime.now()
	user.total_submissions += 1
	dh = 0.0 if not_count else max(end-start,0.0)
	user.total_annotated_hours += dh
  ## score
	user.save()
	user.refresh_from_db()
	return user

def update_recorded_audios(user):
    count = len([elem for elem in os.listdir('/home/quechua/transcriptor/storage/' + user.email) if '.webm' in elem])
    user.total_recorded_audios = count
    user.save()
    user.refresh_from_db()

def hms(total_secs):
   total_secs = int(total_secs)
   h = str(total_secs // 3600)
   m = str( (total_secs % 3600) // 60 )
   s = str( (total_secs % 3600) % 60)
   if len(h)==1: h = '0'+ h
   if len(m)==1: m = '0'+ m
   if len(s)==1: s = '0'+ s
   return h,m,s
