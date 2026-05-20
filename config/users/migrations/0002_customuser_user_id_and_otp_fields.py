

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="customuser",
            old_name="id",
            new_name="user_id",
        ),
        migrations.AddField(
            model_name="customuser",
            name="otp",
            field=models.CharField(blank=True, max_length=6, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="otp_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="customuser",
            name="is_verified",
            field=models.BooleanField(default=False),
        ),
    ]
