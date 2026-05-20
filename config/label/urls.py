from django.urls import path

from . import api_views, views


urlpatterns = [
	path('', views.labels, name='labels'),

	# API views
	path('api/labels/', api_views.LabelsAPIView.as_view(), name='labels_api'),
	path('api/labels/<int:label_id>/', api_views.LabelDetailAPIView.as_view(), name='label_detail_api'),
]
