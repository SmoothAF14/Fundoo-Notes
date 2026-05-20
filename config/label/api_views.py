from __future__ import annotations

from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.vary import vary_on_headers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import OpenApiResponse, extend_schema

from .models import Label
from .serializers import LabelCreateSerializer, LabelSerializer


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class LabelsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: LabelSerializer(many=True)})
    def get(self, request):
        labels = Label.objects.filter(created_by=request.user).order_by('-created_at')
        serializer = LabelSerializer(labels, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=LabelCreateSerializer, responses={201: LabelSerializer})
    def post(self, request):
        serializer = LabelCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        label = Label.objects.create(
            title=serializer.validated_data['title'],
            created_by=request.user,
        )
        return Response(LabelSerializer(label).data, status=status.HTTP_201_CREATED)


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class LabelDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, label_id):
        return get_object_or_404(Label, label_id=label_id, created_by=request.user)

    @extend_schema(responses={200: LabelSerializer})
    def get(self, request, label_id):
        label = self.get_object(request, label_id)
        return Response(LabelSerializer(label).data, status=status.HTTP_200_OK)

    @extend_schema(request=None, responses={204: OpenApiResponse(description='Deleted')})
    def delete(self, request, label_id):
        label = self.get_object(request, label_id)
        label.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
